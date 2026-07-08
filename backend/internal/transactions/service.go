package transactions

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/audit"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/internal/sacco"
	"sentechain-backend/internal/stellar"
	"sentechain-backend/internal/users"
)

var amountPattern = regexp.MustCompile(`^\d+(\.\d{1,2})?$`)

type Service struct {
	txnRepo        *Repository
	membershipRepo *memberships.Repository
	saccoRepo      *sacco.Repository
	userRepo       *users.Repository
	auditRepo      *audit.Repository
	stellar        *stellar.Service
}

func NewService(
	txnRepo *Repository,
	membershipRepo *memberships.Repository,
	saccoRepo *sacco.Repository,
	userRepo *users.Repository,
	auditRepo *audit.Repository,
	stellarSvc *stellar.Service,
) *Service {
	return &Service{
		txnRepo:        txnRepo,
		membershipRepo: membershipRepo,
		saccoRepo:      saccoRepo,
		userRepo:       userRepo,
		auditRepo:      auditRepo,
		stellar:        stellarSvc,
	}
}

func (s *Service) Create(ctx context.Context, actorUserID string, req *CreateRequest) (*Transaction, error) {
	if err := validateCreateRequest(req); err != nil {
		return nil, err
	}

	actor, err := s.userRepo.GetByID(ctx, actorUserID)
	if err != nil {
		return nil, errors.New("authenticated user not found")
	}

	saccoRecord, err := s.saccoRepo.GetByID(ctx, req.SaccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("SACCO not found")
		}
		return nil, fmt.Errorf("failed to load SACCO: %w", err)
	}
	if saccoRecord.Status != sacco.StatusApproved {
		return nil, errors.New("transactions require an approved SACCO")
	}

	actorMembership, err := s.resolveActorMembership(ctx, actorUserID, req.SaccoID, actor.IsProjectAdmin)
	if err != nil {
		return nil, err
	}

	targetMembership, err := s.resolveTargetMembership(ctx, req, actorMembership, actor.IsProjectAdmin)
	if err != nil {
		return nil, err
	}
	if targetMembership.Status != memberships.StatusActive {
		return nil, errors.New("target membership must be active")
	}
	if targetMembership.SaccoID.String() != req.SaccoID {
		return nil, errors.New("membership does not belong to the specified SACCO")
	}

	if err := authorizeTransactionCreate(actorMembership, req.TransactionType, actor.IsProjectAdmin); err != nil {
		return nil, err
	}

	if req.TransactionType == TypeWithdrawal {
		bal, err := s.txnRepo.GetMemberBalance(ctx, targetMembership.ID.String())
		if err != nil {
			return nil, fmt.Errorf("failed to check member balance: %w", err)
		}
		amount, err := strconv.ParseFloat(req.Amount, 64)
		if err != nil {
			return nil, errors.New("invalid withdrawal amount")
		}
		if amount > bal.SavingsBalance {
			return nil, fmt.Errorf("insufficient balance: available %.2f %s", bal.SavingsBalance, bal.Currency)
		}
	}

	metadata := json.RawMessage(`{}`)
	if req.Metadata != nil {
		metadata, err = json.Marshal(req.Metadata)
		if err != nil {
			return nil, errors.New("invalid metadata")
		}
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	ref := GenerateReferenceNumber()

	// Create with temporary proof; recompute after we have created_at from DB
	params := &CreateParams{
		ReferenceNumber: ref,
		SaccoID:         targetMembership.SaccoID,
		MembershipID:    targetMembership.ID,
		InitiatedBy:     actorUUID,
		TransactionType: req.TransactionType,
		Amount:          req.Amount,
		Currency:        strings.ToUpper(req.Currency),
		Description:     req.Description,
		ProofHash:       "",
		Metadata:        metadata,
	}

	txn, err := s.txnRepo.Create(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	proofHash, err := ComputeProofHash(txn)
	if err != nil {
		return nil, err
	}

	updated, err := s.txnRepo.UpdateProofHash(ctx, txn.ID.String(), proofHash)
	if err != nil {
		return nil, err
	}

	actorID := actorUUID
	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorID,
		Action:      audit.ActionTransactionCreated,
		EntityType:  "transaction",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"reference_number": updated.ReferenceNumber,
			"amount":           updated.Amount,
			"currency":         updated.Currency,
			"type":             updated.TransactionType,
		},
	})

	return updated, nil
}

func (s *Service) Get(ctx context.Context, actorUserID, txnID string) (*Transaction, error) {
	txn, err := s.txnRepo.GetByID(ctx, txnID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("transaction not found")
		}
		return nil, err
	}
	if err := s.authorizeRead(ctx, actorUserID, txn); err != nil {
		return nil, err
	}
	return txn, nil
}

func (s *Service) List(ctx context.Context, actorUserID string, filter ListFilter) ([]*Transaction, error) {
	actor, err := s.userRepo.GetByID(ctx, actorUserID)
	if err != nil {
		return nil, errors.New("authenticated user not found")
	}

	if actor.IsProjectAdmin {
		return s.txnRepo.List(ctx, filter)
	}

	membership, err := s.membershipRepo.GetLatestByUser(ctx, actorUserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("no SACCO membership found")
		}
		return nil, err
	}

	switch membership.Role {
	case memberships.RoleAdmin, memberships.RoleCashier:
		if filter.SaccoID != "" && filter.SaccoID != membership.SaccoID.String() {
			return nil, errors.New("not authorized to view transactions for this SACCO")
		}
		filter.SaccoID = membership.SaccoID.String()
	case memberships.RoleMember:
		filter.MembershipID = membership.ID.String()
	default:
		return nil, errors.New("not authorized")
	}

	return s.txnRepo.List(ctx, filter)
}

func (s *Service) Anchor(ctx context.Context, actorUserID, txnID string) (*Transaction, error) {
	if err := s.authorizeAnchor(ctx, actorUserID, txnID); err != nil {
		return nil, err
	}

	txn, err := s.txnRepo.GetByID(ctx, txnID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("transaction not found")
		}
		return nil, err
	}

	if txn.Status == StatusBlockchainVerified {
		return nil, errors.New("transaction is already blockchain verified")
	}
	if txn.Status == StatusCancelled {
		return nil, errors.New("cancelled transactions cannot be anchored")
	}

	proofHash := ""
	if txn.ProofHash != nil {
		proofHash = *txn.ProofHash
	}
	if proofHash == "" {
		computed, err := ComputeProofHash(txn)
		if err != nil {
			return nil, err
		}
		proofHash = computed
	}

	pending, err := s.txnRepo.SetStatus(ctx, txnID, StatusAnchorPending)
	if err != nil {
		return nil, err
	}

	result, err := s.stellar.AnchorProof(proofHash, pending.ReferenceNumber)
	if err != nil {
		if errors.Is(err, stellar.ErrNotConfigured) {
			_, _ = s.txnRepo.SetStatus(ctx, txnID, StatusRecorded)
			return nil, err
		}
		failed, _ := s.txnRepo.UpdateAnchorResult(ctx, txnID, StatusAnchorFailed, nil)
		_ = failed
		return nil, fmt.Errorf("stellar anchoring failed: %w", err)
	}

	updated, err := s.txnRepo.UpdateAnchorResult(ctx, txnID, StatusBlockchainVerified, &result.TransactionHash)
	if err != nil {
		return nil, err
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      audit.ActionTransactionAnchored,
		EntityType:  "transaction",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"stellar_tx_hash": result.TransactionHash,
			"proof_hash":      proofHash,
		},
	})

	return updated, nil
}

func (s *Service) Verify(ctx context.Context, actorUserID, txnID string) (*VerifyResult, error) {
	txn, err := s.Get(ctx, actorUserID, txnID)
	if err != nil {
		return nil, err
	}

	computed, err := ComputeProofHash(txn)
	if err != nil {
		return nil, err
	}

	stored := ""
	if txn.ProofHash != nil {
		stored = *txn.ProofHash
	}

	verified := stored != "" && stored == computed
	result := &VerifyResult{
		TransactionID:   txn.ID.String(),
		ReferenceNumber: txn.ReferenceNumber,
		Verified:        verified,
		Status:          txn.Status,
		ProofHash:       stored,
	}

	if txn.StellarTxHash != nil {
		result.StellarTxHash = *txn.StellarTxHash
	}

	dbMessage := ""
	switch {
	case verified:
		dbMessage = "Database record matches proof hash"
	default:
		dbMessage = "Proof hash mismatch — record may have been altered"
	}

	chainVerified := false
	if verified && txn.StellarTxHash != nil && *txn.StellarTxHash != "" {
		chainVerified, err = s.stellar.VerifyOnChain(*txn.StellarTxHash, stored)
		if err != nil && !errors.Is(err, stellar.ErrNotConfigured) {
			return nil, fmt.Errorf("stellar verification failed: %w", err)
		}
	}

	switch {
	case verified && chainVerified:
		result.Message = dbMessage + "; Stellar memo hash matches on-chain"
		result.Verified = true
	case verified && txn.StellarTxHash != nil && *txn.StellarTxHash != "":
		result.Message = dbMessage + "; Stellar on-chain memo does not match (or tx not found)"
		result.Verified = false
	case verified && txn.Status == StatusBlockchainVerified:
		result.Message = dbMessage + "; blockchain status verified in database"
	case verified:
		result.Message = dbMessage + "; blockchain anchor pending or not configured"
	default:
		result.Message = dbMessage
	}

	if verified {
		actorUUID, _ := uuid.Parse(actorUserID)
		_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
			ActorUserID: &actorUUID,
			Action:      audit.ActionTransactionVerified,
			EntityType:  "transaction",
			EntityID:    txn.ID,
			Details: map[string]interface{}{
				"verified": verified,
				"status":   txn.Status,
			},
		})
	}

	return result, nil
}

func (s *Service) authorizeRead(ctx context.Context, actorUserID string, txn *Transaction) error {
	actor, err := s.userRepo.GetByID(ctx, actorUserID)
	if err != nil {
		return errors.New("authenticated user not found")
	}
	if actor.IsProjectAdmin {
		return nil
	}

	membership, err := s.membershipRepo.GetByUserAndSacco(ctx, actorUserID, txn.SaccoID.String())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("not authorized")
		}
		return err
	}

	if membership.Role == memberships.RoleAdmin || membership.Role == memberships.RoleCashier {
		if membership.Status != memberships.StatusActive {
			return errors.New("not authorized")
		}
		return nil
	}
	if membership.Status != memberships.StatusActive {
		return errors.New("not authorized")
	}
	if membership.ID == txn.MembershipID {
		return nil
	}
	return errors.New("not authorized")
}

func (s *Service) authorizeAnchor(ctx context.Context, actorUserID, txnID string) error {
	txn, err := s.txnRepo.GetByID(ctx, txnID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("transaction not found")
		}
		return err
	}

	actor, err := s.userRepo.GetByID(ctx, actorUserID)
	if err != nil {
		return errors.New("authenticated user not found")
	}
	if actor.IsProjectAdmin {
		return nil
	}

	membership, err := s.membershipRepo.GetByUserAndSacco(ctx, actorUserID, txn.SaccoID.String())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("not authorized to anchor transactions")
		}
		return err
	}
	if membership.Status != memberships.StatusActive {
		return errors.New("not authorized")
	}
	if membership.Role != memberships.RoleAdmin && membership.Role != memberships.RoleCashier {
		return errors.New("only SACCO staff can anchor transactions on Stellar")
	}
	return nil
}

func (s *Service) resolveActorMembership(ctx context.Context, actorUserID, saccoID string, isProjectAdmin bool) (*memberships.Membership, error) {
	if isProjectAdmin {
		return nil, nil
	}
	m, err := s.membershipRepo.GetByUserAndSacco(ctx, actorUserID, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("you are not a member of this SACCO")
		}
		return nil, err
	}
	if m.Status != memberships.StatusActive {
		return nil, errors.New("your membership must be active to initiate transactions")
	}
	return m, nil
}

func (s *Service) resolveTargetMembership(ctx context.Context, req *CreateRequest, actorMembership *memberships.Membership, isProjectAdmin bool) (*memberships.Membership, error) {
	if req.MembershipID != "" {
		m, err := s.membershipRepo.GetByID(ctx, req.MembershipID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, errors.New("membership not found")
			}
			return nil, err
		}
		if isProjectAdmin {
			return m, nil
		}
		if actorMembership == nil {
			return nil, errors.New("not authorized")
		}
		if actorMembership.Role != memberships.RoleAdmin && actorMembership.Role != memberships.RoleCashier {
			if m.ID != actorMembership.ID {
				return nil, errors.New("members can only create transactions for their own membership")
			}
		}
		return m, nil
	}

	if actorMembership == nil {
		return nil, errors.New("membership_id is required")
	}
	return actorMembership, nil
}

// authorizeTransactionCreate enforces who may post which ledger entry types via the API.
// Loan and webhook flows write directly to the repository and bypass this check.
func authorizeTransactionCreate(actorMembership *memberships.Membership, txnType string, isProjectAdmin bool) error {
	if isProjectAdmin {
		return nil
	}
	if actorMembership == nil {
		return errors.New("not authorized")
	}

	switch txnType {
	case TypeLoanDisbursement, TypeLoanRepayment:
		return errors.New("loan transactions must be created through the loans API")
	}

	if actorMembership.Role == memberships.RoleMember {
		return errors.New("members cannot post ledger transactions directly; use Pay Now or ask your cashier")
	}

	if actorMembership.Role == memberships.RoleAdmin || actorMembership.Role == memberships.RoleCashier {
		switch txnType {
		case TypeDeposit, TypeWithdrawal, TypeTransfer, TypeFee, TypeOther:
			return nil
		default:
			return errors.New("invalid transaction type for staff")
		}
	}

	return errors.New("not authorized")
}

func validateCreateRequest(req *CreateRequest) error {
	if req == nil {
		return errors.New("request cannot be nil")
	}
	if req.SaccoID == "" {
		return errors.New("sacco_id is required")
	}
	if req.TransactionType == "" {
		return errors.New("transaction_type is required")
	}
	validType := false
	for _, t := range ValidTypes {
		if req.TransactionType == t {
			validType = true
			break
		}
	}
	if !validType {
		return errors.New("invalid transaction_type")
	}
	if req.Amount == "" || !amountPattern.MatchString(req.Amount) {
		return errors.New("amount must be a positive number with up to 2 decimal places")
	}
	if len(req.Currency) != 3 {
		return errors.New("currency must be a 3-letter code")
	}
	return nil
}
