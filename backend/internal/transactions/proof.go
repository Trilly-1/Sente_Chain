package transactions

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

func BuildProofPayload(txn *Transaction) ProofPayload {
	return ProofPayload{
		TransactionID:   txn.ID.String(),
		ReferenceNumber: txn.ReferenceNumber,
		SaccoID:         txn.SaccoID.String(),
		MembershipID:    txn.MembershipID.String(),
		TransactionType: txn.TransactionType,
		Amount:          txn.Amount,
		Currency:        strings.ToUpper(txn.Currency),
		Timestamp:       txn.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func HashProofPayload(payload ProofPayload) (string, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal proof payload: %w", err)
	}
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:]), nil
}

func ComputeProofHash(txn *Transaction) (string, error) {
	return HashProofPayload(BuildProofPayload(txn))
}

func GenerateReferenceNumber() string {
	return fmt.Sprintf("SC-%s-%s",
		time.Now().UTC().Format("20060102150405"),
		strings.ToUpper(strings.ReplaceAll(uuid.New().String(), "-", ""))[:8],
	)
}
