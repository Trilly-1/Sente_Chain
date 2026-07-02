package loans

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/audit"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/internal/sacco"
	"sentechain-backend/internal/transactions"
)

type Service struct {
	repo           *Repository
	membershipRepo *memberships.Repository
	saccoRepo      *sacco.Repository
	txnRepo        *transactions.Repository
	auditRepo      *audit.Repository
}

func NewService(
	repo *Repository,
	membershipRepo *memberships.Repository,
	saccoRepo *sacco.Repository,
	txnRepo *transactions.Repository,
	auditRepo *audit.Repository,
) *Service {
	return &Service{
		repo:           repo,
		membershipRepo: membershipRepo,
		saccoRepo:      saccoRepo,
		txnRepo:        txnRepo,
		auditRepo:      auditRepo,
	}
}

func (s *Service) CreateProduct(ctx context.Context, saccoID string, req *CreateProductRequest) (*LoanProduct, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}
	if err := validateProductRequest(req); err != nil {
		return nil, err
	}
	return s.repo.CreateProduct(ctx, saccoID, req)
}

func (s *Service) ListProducts(ctx context.Context, saccoID string, activeOnly bool) ([]*LoanProduct, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}
	return s.repo.ListProducts(ctx, saccoID, activeOnly)
}

func (s *Service) UpdateProduct(ctx context.Context, saccoID, productID string, req *UpdateProductRequest) (*LoanProduct, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}
	if req.InterestMethod != nil && *req.InterestMethod != MethodFlat && *req.InterestMethod != MethodReducingBalance {
		return nil, errors.New("invalid interest_method")
	}
	return s.repo.UpdateProduct(ctx, saccoID, productID, req)
}

func (s *Service) Apply(ctx context.Context, userID, saccoID string, req *ApplyLoanRequest) (*LoanListItem, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}
	if req == nil || req.Principal <= 0 {
		return nil, errors.New("principal must be positive")
	}
	if req.TermMonths < 1 {
		return nil, errors.New("term_months must be at least 1")
	}

	membership, err := s.membershipRepo.GetByUserAndSacco(ctx, userID, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("you are not a member of this SACCO")
		}
		return nil, err
	}
	if membership.Status != memberships.StatusActive {
		return nil, errors.New("your membership must be active to apply for a loan")
	}
	if membership.Role != memberships.RoleMember {
		return nil, errors.New("only members can apply for loans")
	}

	product, err := s.resolveProduct(ctx, saccoID, req.LoanProductID)
	if err != nil {
		return nil, err
	}
	if req.TermMonths < product.MinTermMonths || req.TermMonths > product.MaxTermMonths {
		return nil, fmt.Errorf("term must be between %d and %d months", product.MinTermMonths, product.MaxTermMonths)
	}

	rate, _ := ParseAmount(product.InterestRateAnnual)
	summary, err := BuildSchedule(req.Principal, req.TermMonths, rate, product.InterestMethod, time.Now())
	if err != nil {
		return nil, err
	}

	var productID *uuid.UUID
	if product.ID != uuid.Nil {
		id := product.ID
		productID = &id
	}

	purpose, collateral, guarantor := optionalStrings(req.Purpose, req.Collateral, req.Guarantor)
	loan := &Loan{
		SaccoID:            membership.SaccoID,
		MembershipID:       membership.ID,
		LoanProductID:      productID,
		ReferenceNumber:    GenerateReference(),
		Principal:          FormatAmount(req.Principal),
		TermMonths:         req.TermMonths,
		InterestRateAnnual: product.InterestRateAnnual,
		InterestMethod:     product.InterestMethod,
		Purpose:            purpose,
		Collateral:         collateral,
		Guarantor:          guarantor,
		Status:             StatusPending,
		MonthlyInstallment: FormatAmount(summary.MonthlyInstallment),
		TotalInterest:      FormatAmount(summary.TotalInterest),
		TotalRepayable:     FormatAmount(summary.TotalRepayable),
		BalanceRemaining:   "0",
	}

	created, err := s.repo.CreateLoan(ctx, loan)
	if err != nil {
		return nil, fmt.Errorf("failed to create loan application: %w", err)
	}

	actorID, _ := uuid.Parse(userID)
	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorID,
		Action:      "loan.applied",
		EntityType:  "loan",
		EntityID:    created.ID,
		Details: map[string]interface{}{
			"reference_number": created.ReferenceNumber,
			"principal":        created.Principal,
			"term_months":      created.TermMonths,
		},
	})

	return s.enrichLoan(ctx, created)
}

func (s *Service) ListBySacco(ctx context.Context, saccoID, status string) ([]*LoanListItem, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}
	loans, err := s.repo.ListLoansBySacco(ctx, saccoID, status)
	if err != nil {
		return nil, err
	}
	return s.enrichLoans(ctx, loans)
}

func (s *Service) ListByMember(ctx context.Context, userID, saccoID string) ([]*LoanListItem, error) {
	membership, err := s.membershipRepo.GetByUserAndSacco(ctx, userID, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("membership not found")
		}
		return nil, err
	}
	loans, err := s.repo.ListLoansByMembership(ctx, membership.ID.String())
	if err != nil {
		return nil, err
	}
	return s.enrichLoans(ctx, loans)
}

func (s *Service) GetLoan(ctx context.Context, loanID string) (*LoanListItem, error) {
	loan, err := s.repo.GetLoan(ctx, loanID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("loan not found")
		}
		return nil, err
	}
	return s.enrichLoan(ctx, loan)
}

func (s *Service) Approve(ctx context.Context, actorUserID, saccoID, loanID string) (*LoanListItem, error) {
	loan, err := s.repo.GetLoan(ctx, loanID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("loan not found")
		}
		return nil, err
	}
	if loan.SaccoID.String() != saccoID {
		return nil, errors.New("loan does not belong to this SACCO")
	}
	if loan.Status != StatusPending {
		return nil, errors.New("only pending loans can be approved")
	}

	principal, _ := ParseAmount(loan.Principal)
	rate, _ := ParseAmount(loan.InterestRateAnnual)
	summary, err := BuildSchedule(principal, loan.TermMonths, rate, loan.InterestMethod, time.Now())
	if err != nil {
		return nil, err
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	desc := fmt.Sprintf("Loan disbursement %s", loan.ReferenceNumber)
	txn, err := s.createTransaction(ctx, actorUUID, loan.SaccoID, loan.MembershipID, transactions.TypeLoanDisbursement, loan.Principal, "UGX", &desc, map[string]interface{}{
		"loan_id":           loan.ID.String(),
		"reference_number":  loan.ReferenceNumber,
		"principal":         loan.Principal,
		"interest_method":   loan.InterestMethod,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to record disbursement: %w", err)
	}

	updated, err := s.repo.UpdateLoanApproved(ctx, loanID, actorUUID, txn.ID, summary)
	if err != nil {
		return nil, errors.New("loan could not be approved (may already be processed)")
	}

	if err := s.repo.CreateInstallments(ctx, updated.ID, summary.Rows); err != nil {
		return nil, fmt.Errorf("failed to create repayment schedule: %w", err)
	}

	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      "loan.approved",
		EntityType:  "loan",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"reference_number": updated.ReferenceNumber,
			"transaction_id":   txn.ID.String(),
			"amount":           updated.Principal,
		},
	})

	return s.enrichLoan(ctx, updated)
}

func (s *Service) Reject(ctx context.Context, actorUserID, saccoID, loanID string) (*LoanListItem, error) {
	loan, err := s.repo.GetLoan(ctx, loanID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("loan not found")
		}
		return nil, err
	}
	if loan.SaccoID.String() != saccoID {
		return nil, errors.New("loan does not belong to this SACCO")
	}
	if loan.Status != StatusPending {
		return nil, errors.New("only pending loans can be rejected")
	}

	updated, err := s.repo.UpdateLoanRejected(ctx, loanID)
	if err != nil {
		return nil, errors.New("loan could not be rejected")
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      "loan.rejected",
		EntityType:  "loan",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"reference_number": updated.ReferenceNumber,
		},
	})

	return s.enrichLoan(ctx, updated)
}

func (s *Service) Repay(ctx context.Context, actorUserID, loanID string, req *RepaymentRequest) (*LoanListItem, error) {
	if req == nil || req.Amount <= 0 {
		return nil, errors.New("amount must be positive")
	}

	loan, err := s.repo.GetLoan(ctx, loanID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("loan not found")
		}
		return nil, err
	}
	if loan.Status != StatusActive {
		return nil, errors.New("repayments are only allowed on active loans")
	}

	balance, _ := ParseAmount(loan.BalanceRemaining)
	if req.Amount > balance+0.01 {
		return nil, fmt.Errorf("amount exceeds balance remaining (%.2f)", balance)
	}

	inst, err := s.repo.GetNextPendingInstallment(ctx, loanID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("no pending installments")
		}
		return nil, err
	}

	principalDue, _ := ParseAmount(inst.PrincipalDue)
	interestDue, _ := ParseAmount(inst.InterestDue)
	principalPaid, _ := ParseAmount(inst.PrincipalPaid)
	interestPaid, _ := ParseAmount(inst.InterestPaid)

	remainingInterest := roundMoney(interestDue - interestPaid)
	remainingPrincipal := roundMoney(principalDue - principalPaid)

	amount := roundMoney(req.Amount)
	interestPortion := amount
	if interestPortion > remainingInterest {
		interestPortion = remainingInterest
	}
	principalPortion := roundMoney(amount - interestPortion)
	if principalPortion > remainingPrincipal {
		principalPortion = remainingPrincipal
		interestPortion = roundMoney(amount - principalPortion)
	}

	instStatus := InstallmentPartial
	if roundMoney(principalPaid+principalPortion) >= principalDue-0.01 && roundMoney(interestPaid+interestPortion) >= interestDue-0.01 {
		instStatus = InstallmentPaid
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	desc := fmt.Sprintf("Loan repayment %s", loan.ReferenceNumber)
	txn, err := s.createTransaction(ctx, actorUUID, loan.SaccoID, loan.MembershipID, transactions.TypeLoanRepayment, FormatAmount(amount), "UGX", &desc, map[string]interface{}{
		"loan_id":          loan.ID.String(),
		"reference_number": loan.ReferenceNumber,
		"principal":        FormatAmount(principalPortion),
		"interest":         FormatAmount(interestPortion),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to record repayment: %w", err)
	}

	txnID := txn.ID
	if err := s.repo.UpdateInstallmentPayment(ctx, inst.ID.String(), principalPortion, interestPortion, instStatus, &txnID); err != nil {
		return nil, err
	}

	newBalance := roundMoney(balance - amount)
	completed := newBalance <= 0.01
	updated, err := s.repo.UpdateLoanRepayment(ctx, loanID, principalPortion, interestPortion, newBalance, completed)
	if err != nil {
		return nil, err
	}

	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      "loan.repayment",
		EntityType:  "loan",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"amount":           FormatAmount(amount),
			"principal":        FormatAmount(principalPortion),
			"interest":         FormatAmount(interestPortion),
			"transaction_id":   txn.ID.String(),
		},
	})

	return s.enrichLoan(ctx, updated)
}

func (s *Service) createTransaction(ctx context.Context, actor uuid.UUID, saccoID, membershipID uuid.UUID, txnType, amount, currency string, desc *string, metadata map[string]interface{}) (*transactions.Transaction, error) {
	meta := json.RawMessage(`{}`)
	if metadata != nil {
		b, err := json.Marshal(metadata)
		if err != nil {
			return nil, errors.New("invalid metadata")
		}
		meta = b
	}

	txn, err := s.txnRepo.Create(ctx, &transactions.CreateParams{
		ReferenceNumber: transactions.GenerateReferenceNumber(),
		SaccoID:         saccoID,
		MembershipID:    membershipID,
		InitiatedBy:     actor,
		TransactionType: txnType,
		Amount:          amount,
		Currency:        currency,
		Description:     desc,
		ProofHash:       "",
		Metadata:        meta,
	})
	if err != nil {
		return nil, err
	}

	proofHash, err := transactions.ComputeProofHash(txn)
	if err != nil {
		return nil, err
	}
	return s.txnRepo.UpdateProofHash(ctx, txn.ID.String(), proofHash)
}

func (s *Service) resolveProduct(ctx context.Context, saccoID string, productID *string) (*LoanProduct, error) {
	if productID != nil && *productID != "" {
		p, err := s.repo.GetProduct(ctx, saccoID, *productID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, errors.New("loan product not found")
			}
			return nil, err
		}
		if !p.IsActive {
			return nil, errors.New("loan product is not active")
		}
		return p, nil
	}

	p, err := s.repo.GetDefaultProduct(ctx, saccoID)
	if err == nil {
		return p, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	list, err := s.repo.ListProducts(ctx, saccoID, true)
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, errors.New("no loan product configured for this SACCO")
	}
	return list[0], nil
}

func (s *Service) requireApprovedSacco(ctx context.Context, saccoID string) error {
	record, err := s.saccoRepo.GetByID(ctx, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("SACCO not found")
		}
		return err
	}
	if record.Status != sacco.StatusApproved {
		return errors.New("SACCO is not approved")
	}
	return nil
}

func validateProductRequest(req *CreateProductRequest) error {
	if req == nil || req.Name == "" {
		return errors.New("name is required")
	}
	if req.InterestRateAnnual < 0 {
		return errors.New("interest_rate_annual must be non-negative")
	}
	if req.InterestMethod != MethodFlat && req.InterestMethod != MethodReducingBalance {
		return errors.New("interest_method must be flat or reducing_balance")
	}
	if req.MinTermMonths < 1 || req.MaxTermMonths < req.MinTermMonths {
		return errors.New("invalid term range")
	}
	return nil
}

func optionalStrings(parts ...string) (*string, *string, *string) {
	out := make([]*string, 3)
	for i, p := range parts {
		if p != "" {
			v := p
			out[i] = &v
		}
	}
	return out[0], out[1], out[2]
}

func (s *Service) enrichLoans(ctx context.Context, loans []*Loan) ([]*LoanListItem, error) {
	out := make([]*LoanListItem, 0, len(loans))
	for _, l := range loans {
		item, err := s.enrichLoan(ctx, l)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *Service) enrichLoan(ctx context.Context, loan *Loan) (*LoanListItem, error) {
	name, phone, err := s.repo.MemberInfo(ctx, loan.MembershipID.String())
	if err != nil {
		return nil, err
	}

	savings, _ := s.repo.SumMemberDeposits(ctx, loan.MembershipID.String())
	principal, _ := ParseAmount(loan.Principal)
	rate, _ := ParseAmount(loan.InterestRateAnnual)
	monthly, _ := ParseAmount(loan.MonthlyInstallment)
	totalRep, _ := ParseAmount(loan.TotalRepayable)
	totalInt, _ := ParseAmount(loan.TotalInterest)
	balance, _ := ParseAmount(loan.BalanceRemaining)
	principalPaid, _ := ParseAmount(loan.PrincipalPaid)
	interestPaid, _ := ParseAmount(loan.InterestPaid)
	repaid := roundMoney(principalPaid + interestPaid)

	purpose, collateral, guarantor := "", "", ""
	if loan.Purpose != nil {
		purpose = *loan.Purpose
	}
	if loan.Collateral != nil {
		collateral = *loan.Collateral
	}
	if loan.Guarantor != nil {
		guarantor = *loan.Guarantor
	}

	paymentsMade, _ := s.repo.CountPaidInstallments(ctx, loan.ID.String())
	installments, _ := s.repo.ListInstallments(ctx, loan.ID.String())

	schedule := buildScheduleItems(installments)
	var disbursedOn *string
	if loan.DisbursedAt != nil {
		d := loan.DisbursedAt.Format("2006-01-02")
		disbursedOn = &d
	}

	var nextDate *string
	var nextAmount *float64
	if loan.Status == StatusActive {
		if inst, err := s.repo.GetNextPendingInstallment(ctx, loan.ID.String()); err == nil {
			d := inst.DueDate.Format("2006-01-02")
			nextDate = &d
			totalDue, _ := ParseAmount(inst.TotalDue)
			prPaid, _ := ParseAmount(inst.PrincipalPaid)
			inPaid, _ := ParseAmount(inst.InterestPaid)
			amt := roundMoney(totalDue - prPaid - inPaid)
			nextAmount = &amt
		}
	}

	// For pending loans, show projected schedule
	if loan.Status == StatusPending && len(schedule) == 0 {
		if summary, err := BuildSchedule(principal, loan.TermMonths, rate, loan.InterestMethod, time.Now()); err == nil {
			schedule = projectedSchedule(summary.Rows)
		}
	}

	return &LoanListItem{
		ID:                 loan.ID.String(),
		ReferenceNumber:    loan.ReferenceNumber,
		MemberID:           loan.MembershipID.String(),
		MemberName:         name,
		Phone:              phone,
		AmountRequested:    principal,
		Purpose:            purpose,
		Status:             loan.Status,
		AppliedOn:          loan.AppliedAt.Format("2006-01-02"),
		InterestRate:       rate,
		TermMonths:         loan.TermMonths,
		InterestMethod:     loan.InterestMethod,
		MonthlyInstallment: monthly,
		TotalRepayable:     totalRep,
		TotalInterest:      totalInt,
		DisbursedOn:        disbursedOn,
		Collateral:         collateral,
		Guarantor:          guarantor,
		RepaidSoFar:        repaid,
		BalanceRemaining:   balance,
		PaymentsMade:       paymentsMade,
		PaymentsTotal:      loan.TermMonths,
		NextPaymentDate:    nextDate,
		NextPaymentAmount:  nextAmount,
		PaymentsSchedule:   schedule,
		SavingsBalance:     savings,
	}, nil
}

func buildScheduleItems(installments []*Installment) []ScheduleItem {
	if len(installments) == 0 {
		return []ScheduleItem{}
	}
	out := make([]ScheduleItem, 0, len(installments))
	for _, inst := range installments {
		p, _ := ParseAmount(inst.PrincipalDue)
		in, _ := ParseAmount(inst.InterestDue)
		t, _ := ParseAmount(inst.TotalDue)
		status := "upcoming"
		if inst.Status == InstallmentPaid {
			status = "paid"
		}
		out = append(out, ScheduleItem{
			Month:     inst.InstallmentNumber,
			DueDate:   inst.DueDate.Format("2006-01-02"),
			Principal: p,
			Interest:  in,
			Total:     t,
			Status:    status,
		})
	}
	return out
}

func projectedSchedule(rows []ScheduleRow) []ScheduleItem {
	out := make([]ScheduleItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, ScheduleItem{
			Month:     r.InstallmentNumber,
			DueDate:   r.DueDate.Format("2006-01-02"),
			Principal: r.PrincipalDue,
			Interest:  r.InterestDue,
			Total:     r.TotalDue,
			Status:    "upcoming",
		})
	}
	return out
}
