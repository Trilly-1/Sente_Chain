package stellar

import (
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/stellar/go/clients/horizonclient"
	"github.com/stellar/go/keypair"
	"github.com/stellar/go/txnbuild"
)

// ErrNotConfigured is returned when Stellar anchoring env vars are not set.
var ErrNotConfigured = errors.New("stellar anchoring is not configured")

// Config holds Stellar settings loaded from environment variables.
type Config struct {
	HorizonURL        string
	NetworkPassphrase string
	SourceSecret      string
	SourcePublicKey   string
	AnchorAmount      string
	Enabled           bool
}

// LoadConfigFromEnv reads Stellar configuration from the environment.
func LoadConfigFromEnv() Config {
	horizon := strings.TrimSpace(os.Getenv("STELLAR_HORIZON_URL"))
	passphrase := strings.TrimSpace(os.Getenv("STELLAR_NETWORK_PASSPHRASE"))
	secret := strings.TrimSpace(os.Getenv("STELLAR_SOURCE_SECRET"))
	publicKey := strings.TrimSpace(os.Getenv("STELLAR_SOURCE_PUBLIC_KEY"))
	anchorAmount := strings.TrimSpace(os.Getenv("STELLAR_ANCHOR_AMOUNT"))
	if anchorAmount == "" {
		anchorAmount = strings.TrimSpace(os.Getenv("STELLAR_ANCHOR_XLM_AMOUNT"))
	}

	enabled := horizon != "" && passphrase != "" && secret != ""
	return Config{
		HorizonURL:        horizon,
		NetworkPassphrase: passphrase,
		SourceSecret:      secret,
		SourcePublicKey:   publicKey,
		AnchorAmount:      anchorAmount,
		Enabled:           enabled,
	}
}

// AnchorResult is returned after a successful Stellar submission.
type AnchorResult struct {
	TransactionHash string `json:"transaction_hash"`
}

// Service submits proof hashes to Stellar when configured.
type Service struct {
	cfg Config
}

func NewService(cfg Config) *Service {
	return &Service{cfg: cfg}
}

func (s *Service) horizonClient() *horizonclient.Client {
	return &horizonclient.Client{HorizonURL: s.cfg.HorizonURL}
}

func (s *Service) sourceKeypair() (*keypair.Full, error) {
	kp, err := keypair.ParseFull(s.cfg.SourceSecret)
	if err != nil {
		return nil, fmt.Errorf("invalid STELLAR_SOURCE_SECRET: %w", err)
	}
	if s.cfg.SourcePublicKey != "" && kp.Address() != s.cfg.SourcePublicKey {
		return nil, errors.New("STELLAR_SOURCE_PUBLIC_KEY does not match STELLAR_SOURCE_SECRET")
	}
	return kp, nil
}

func (s *Service) anchorAmount() (string, error) {
	amount := strings.TrimSpace(s.cfg.AnchorAmount)
	if amount == "" {
		return "", errors.New("STELLAR_ANCHOR_AMOUNT is not set")
	}
	return amount, nil
}

// AnchorProof anchors the proof hash on Stellar as a MemoHash on a minimal payment.
// Only the 32-byte hash goes on-chain — never full financial records.
func (s *Service) AnchorProof(proofHashHex, referenceNumber string) (*AnchorResult, error) {
	if !s.cfg.Enabled {
		return nil, ErrNotConfigured
	}
	if proofHashHex == "" {
		return nil, errors.New("proof hash is required")
	}

	hashBytes, err := hex.DecodeString(proofHashHex)
	if err != nil {
		return nil, fmt.Errorf("invalid proof hash encoding: %w", err)
	}
	if len(hashBytes) != 32 {
		return nil, fmt.Errorf("proof hash must be 32 bytes (sha256), got %d", len(hashBytes))
	}

	kp, err := s.sourceKeypair()
	if err != nil {
		return nil, err
	}

	amount, err := s.anchorAmount()
	if err != nil {
		return nil, err
	}

	client := s.horizonClient()
	account, err := client.AccountDetail(horizonclient.AccountRequest{AccountID: kp.Address()})
	if err != nil {
		return nil, fmt.Errorf("failed to load stellar source account: %w", err)
	}

	tx, err := txnbuild.NewTransaction(
		txnbuild.TransactionParams{
			SourceAccount:        &account,
			IncrementSequenceNum: true,
			Operations: []txnbuild.Operation{
				&txnbuild.Payment{
					Destination: kp.Address(),
					Amount:      amount,
					Asset:       txnbuild.NativeAsset{},
				},
			},
			Memo:    txnbuild.MemoHash(hashBytes),
			BaseFee: txnbuild.MinBaseFee,
			Preconditions: txnbuild.Preconditions{
				TimeBounds: txnbuild.NewTimeout(300),
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build stellar transaction: %w", err)
	}

	signed, err := tx.Sign(s.cfg.NetworkPassphrase, kp)
	if err != nil {
		return nil, fmt.Errorf("failed to sign stellar transaction: %w", err)
	}

	resp, err := client.SubmitTransaction(signed)
	if err != nil {
		return nil, fmt.Errorf("horizon submit failed: %w", err)
	}

	_ = referenceNumber

	return &AnchorResult{TransactionHash: resp.Hash}, nil
}

// VerifyOnChain checks that a Stellar transaction memo hash matches the expected proof.
func (s *Service) VerifyOnChain(stellarTxHash, expectedProofHashHex string) (bool, error) {
	if !s.cfg.Enabled {
		return false, ErrNotConfigured
	}
	if stellarTxHash == "" {
		return false, errors.New("stellar transaction hash is required")
	}

	expectedBytes, err := hex.DecodeString(expectedProofHashHex)
	if err != nil || len(expectedBytes) != 32 {
		return false, errors.New("invalid expected proof hash")
	}

	client := s.horizonClient()
	tx, err := client.TransactionDetail(stellarTxHash)
	if err != nil {
		return false, fmt.Errorf("failed to load stellar transaction: %w", err)
	}

	if tx.MemoType != "hash" || tx.Memo == "" {
		return false, nil
	}

	onChainBytes, err := base64.StdEncoding.DecodeString(tx.Memo)
	if err != nil || len(onChainBytes) != 32 {
		onChainBytes, err = hex.DecodeString(tx.Memo)
		if err != nil || len(onChainBytes) != 32 {
			return false, nil
		}
	}

	for i := range expectedBytes {
		if onChainBytes[i] != expectedBytes[i] {
			return false, nil
		}
	}
	return true, nil
}
