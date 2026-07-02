package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/internal/sacco"
	"sentechain-backend/internal/transactions"
)

type Service struct {
	repo           *Repository
	saccoRepo      *sacco.Repository
	membershipRepo *memberships.Repository
	txnRepo        *transactions.Repository
	gateway        *ProviderGateway
}

func NewService(repo *Repository, saccoRepo *sacco.Repository, membershipRepo *memberships.Repository, txnRepo *transactions.Repository, gateway *ProviderGateway) *Service {
	return &Service{repo: repo, saccoRepo: saccoRepo, membershipRepo: membershipRepo, txnRepo: txnRepo, gateway: gateway}
}

func (s *Service) ListAccounts(ctx context.Context, saccoID string) ([]*PaymentAccount, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}
	return s.repo.ListAccounts(ctx, saccoID)
}

func (s *Service) UpsertAccounts(ctx context.Context, saccoID string, req *UpsertAccountsRequest) ([]*PaymentAccount, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}
	if req == nil || len(req.Accounts) == 0 {
		return nil, errors.New("at least one payment account is required")
	}

	var out []*PaymentAccount
	primarySet := false
	for _, in := range req.Accounts {
		if in.Provider != ProviderMTNMoMo && in.Provider != ProviderAirtelMoney {
			return nil, fmt.Errorf("invalid provider: %s", in.Provider)
		}
		if strings.TrimSpace(in.PhoneNumber) == "" {
			return nil, fmt.Errorf("phone_number is required for %s", in.Provider)
		}
		if in.IsPrimary {
			primarySet = true
		}
		acc, err := s.repo.UpsertAccount(ctx, saccoID, &in)
		if err != nil {
			return nil, err
		}
		out = append(out, acc)
	}
	if !primarySet && len(out) > 0 {
		if err := s.repo.SetPrimary(ctx, saccoID, out[0].ID.String()); err == nil {
			out[0].IsPrimary = true
		}
	}
	return out, nil
}

func (s *Service) GetInstructionsForMember(ctx context.Context, userID, saccoID string) (*PaymentInstructions, error) {
	membership, err := s.membershipRepo.GetByUserAndSacco(ctx, userID, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("you are not a member of this SACCO")
		}
		return nil, err
	}
	if membership.Status != memberships.StatusActive {
		return nil, errors.New("your membership must be active")
	}
	return s.GetInstructions(ctx, saccoID, membership.ID.String())
}

func (s *Service) GetInstructions(ctx context.Context, saccoID, membershipID string) (*PaymentInstructions, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}
	name, err := s.repo.GetSaccoName(ctx, saccoID)
	if err != nil {
		return nil, err
	}
	accounts, err := s.repo.ListAccounts(ctx, saccoID)
	if err != nil {
		return nil, err
	}
	if len(accounts) == 0 {
		return nil, errors.New("this SACCO has not configured payment numbers yet")
	}

	ref := membershipID
	shortRef := strings.ToUpper(strings.ReplaceAll(membershipID, "-", ""))
	if len(shortRef) > 8 {
		shortRef = shortRef[:8]
	}

	display := make([]AccountDisplay, 0, len(accounts))
	for _, a := range accounts {
		label := "MTN MoMo"
		if a.Provider == ProviderAirtelMoney {
			label = "Airtel Money"
		}
		acctName := ""
		if a.AccountName != nil {
			acctName = *a.AccountName
		}
		display = append(display, AccountDisplay{
			Provider:    a.Provider,
			Label:       label,
			PhoneNumber: a.PhoneNumber,
			AccountName: acctName,
			IsPrimary:   a.IsPrimary,
		})
	}

	return &PaymentInstructions{
		SaccoID:          saccoID,
		SaccoName:        name,
		PaymentReference: ref,
		MemberReference:  shortRef,
		Accounts:         display,
		Instructions: []string{
			"Money goes directly to your SACCO wallet — SenteChain never holds your funds.",
			fmt.Sprintf("Include reference %s in the payment reason/message.", shortRef),
			"Use Pay Now for STK prompt when API is connected, or pay manually to the numbers below.",
		},
		MTNApiReady:    s.gateway != nil && s.gateway.MTN.Configured(),
		AirtelApiReady: s.gateway != nil && s.gateway.Airtel.Configured(),
	}, nil
}

func (s *Service) RequestToPay(ctx context.Context, userID string, req *RequestToPayBody) (*RequestToPayResponse, error) {
	if req == nil || req.Amount <= 0 {
		return nil, errors.New("amount must be positive")
	}
	if req.SaccoID == "" {
		return nil, errors.New("sacco_id is required")
	}
	provider := req.Provider
	if provider == "" {
		provider = ProviderMTNMoMo
	}
	if provider != ProviderMTNMoMo && provider != ProviderAirtelMoney {
		return nil, errors.New("provider must be mtn_momo or airtel_money")
	}

	membership, err := s.membershipRepo.GetByUserAndSacco(ctx, userID, req.SaccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("you are not a member of this SACCO")
		}
		return nil, err
	}
	if membership.Status != memberships.StatusActive {
		return nil, errors.New("your membership must be active")
	}
	if membership.Role != memberships.RoleMember {
		return nil, errors.New("only members can use Pay Now; cashiers should record payments manually")
	}

	shortRef := strings.ToUpper(strings.ReplaceAll(membership.ID.String(), "-", ""))
	if len(shortRef) > 8 {
		shortRef = shortRef[:8]
	}

	payee, err := s.repo.FindAccountByProvider(ctx, req.SaccoID, provider)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("this SACCO has not configured a payment number for that provider")
		}
		return nil, err
	}

	payerPhone, err := s.repo.MemberPhone(ctx, membership.ID.String())
	if err != nil {
		return nil, errors.New("could not resolve your phone number")
	}

	in := &RequestToPayInput{
		SaccoID:      req.SaccoID,
		MembershipID: membership.ID.String(),
		Amount:       req.Amount,
		Currency:     "UGX",
		PayerPhone:   payerPhone,
		PayeePhone:   payee.PhoneNumber,
		Reference:    shortRef,
		Provider:     provider,
	}

	if s.gateway == nil {
		return manualPayResponse(provider, req.Amount, shortRef, payee.PhoneNumber), nil
	}

	var result *RequestToPayResult
	switch provider {
	case ProviderMTNMoMo:
		if !s.gateway.MTN.Configured() {
			return manualPayResponse(provider, req.Amount, shortRef, payee.PhoneNumber), nil
		}
		result, err = s.gateway.MTN.RequestToPay(ctx, in)
	case ProviderAirtelMoney:
		if !s.gateway.Airtel.Configured() {
			return manualPayResponse(provider, req.Amount, shortRef, payee.PhoneNumber), nil
		}
		result, err = s.gateway.Airtel.RequestToPay(ctx, in)
	}
	if err != nil {
		if errors.Is(err, ErrProviderNotConfigured) {
			return manualPayResponse(provider, req.Amount, shortRef, payee.PhoneNumber), nil
		}
		return nil, err
	}

	return &RequestToPayResponse{
		Status:     result.Status,
		Message:    result.Message,
		ExternalID: result.ExternalID,
		Provider:   provider,
		Amount:     req.Amount,
		Currency:   "UGX",
		Mode:       "stk",
	}, nil
}

func manualPayResponse(provider string, amount float64, ref, payeePhone string) *RequestToPayResponse {
	label := "MTN MoMo"
	if provider == ProviderAirtelMoney {
		label = "Airtel Money"
	}
	return &RequestToPayResponse{
		Status:  "manual",
		Mode:    "manual",
		Provider: provider,
		Amount:  amount,
		Currency: "UGX",
		Message: fmt.Sprintf("Pay %s to %s on %s and include reference %s in the reason. Your cashier will confirm once API keys are added.", FormatAmount(amount), payeePhone, label, ref),
	}
}

func (s *Service) ProcessInbound(ctx context.Context, payload *WebhookPayload, raw json.RawMessage) (*InboundEvent, error) {
	if payload == nil || payload.ExternalID == "" {
		return nil, errors.New("external_id is required")
	}
	if payload.Amount <= 0 {
		return nil, errors.New("amount must be positive")
	}
	if payload.Provider != ProviderMTNMoMo && payload.Provider != ProviderAirtelMoney {
		return nil, errors.New("invalid provider")
	}
	if payload.Currency == "" {
		payload.Currency = "UGX"
	}

	saccoID, err := s.repo.FindSaccoByPayeePhone(ctx, payload.PayeePhone)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return s.logInbound(ctx, nil, payload, raw, EventUnmatched, nil, nil)
		}
		return nil, err
	}

	membershipID, matchErr := s.repo.FindMembershipByReference(ctx, saccoID, payload.Reference)
	if matchErr != nil && payload.PayerPhone != "" {
		membershipID, matchErr = s.repo.FindMembershipByPhone(ctx, saccoID, payload.PayerPhone)
	}

	if matchErr != nil {
		sid, _ := uuid.Parse(saccoID)
		return s.logInbound(ctx, &sid, payload, raw, EventUnmatched, nil, nil)
	}

	memUUID, _ := uuid.Parse(membershipID)
	saccoUUID, _ := uuid.Parse(saccoID)
	sid := saccoUUID

	desc := fmt.Sprintf("Mobile money deposit via %s", payload.Provider)
	meta, _ := json.Marshal(map[string]interface{}{
		"provider":      payload.Provider,
		"external_id":   payload.ExternalID,
		"payer_phone":   payload.PayerPhone,
		"payee_phone":   payload.PayeePhone,
		"reference":     payload.Reference,
		"auto_matched":  true,
	})

	txn, err := s.txnRepo.Create(ctx, &transactions.CreateParams{
		ReferenceNumber: transactions.GenerateReferenceNumber(),
		SaccoID:         saccoUUID,
		MembershipID:    memUUID,
		InitiatedBy:     memUUID,
		TransactionType: transactions.TypeDeposit,
		Amount:          FormatAmount(payload.Amount),
		Currency:        strings.ToUpper(payload.Currency),
		Description:     &desc,
		ProofHash:       "",
		Metadata:        meta,
	})
	if err != nil {
		return s.logInbound(ctx, &sid, payload, raw, EventFailed, &memUUID, nil)
	}

	proofHash, err := transactions.ComputeProofHash(txn)
	if err == nil {
		txn, _ = s.txnRepo.UpdateProofHash(ctx, txn.ID.String(), proofHash)
	}

	return s.logInbound(ctx, &sid, payload, raw, EventMatched, &memUUID, &txn.ID)
}

func (s *Service) logInbound(ctx context.Context, saccoID *uuid.UUID, payload *WebhookPayload, raw json.RawMessage, status string, membershipID, txnID *uuid.UUID) (*InboundEvent, error) {
	var payer, payee, ref *string
	if payload.PayerPhone != "" {
		p := NormalizePhone(payload.PayerPhone)
		payer = &p
	}
	if payload.PayeePhone != "" {
		p := NormalizePhone(payload.PayeePhone)
		payee = &p
	}
	if payload.Reference != "" {
		ref = &payload.Reference
	}
	if len(raw) == 0 {
		raw = json.RawMessage(`{}`)
	}

	event := &InboundEvent{
		SaccoID:       saccoID,
		Provider:      payload.Provider,
		ExternalID:    payload.ExternalID,
		PayerPhone:    payer,
		PayeePhone:    payee,
		Amount:        FormatAmount(payload.Amount),
		Currency:      strings.ToUpper(payload.Currency),
		ReferenceText: ref,
		Status:        status,
		MembershipID:  membershipID,
		TransactionID: txnID,
		RawPayload:    raw,
	}
	return s.repo.InsertInboundEvent(ctx, event)
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

// ParseMTNWebhook maps MTN MoMo callback fields into a normalized payload.
// Field names will be adjusted once live API credentials and docs are available.
func ParseMTNWebhook(body map[string]interface{}) (*WebhookPayload, error) {
	extID := stringField(body, "externalId", "financialTransactionId", "transactionId", "id")
	amount := floatField(body, "amount", "Amount")
	return &WebhookPayload{
		ExternalID: extID,
		Amount:     amount,
		Currency:   stringField(body, "currency", "Currency"),
		PayerPhone: stringField(body, "payer", "payerPartyId", "payer_phone"),
		PayeePhone: stringField(body, "payee", "payeePartyId", "payee_phone"),
		Reference:  stringField(body, "externalReference", "payerMessage", "reference", "note"),
		Provider:   ProviderMTNMoMo,
	}, nil
}

func ParseAirtelWebhook(body map[string]interface{}) (*WebhookPayload, error) {
	extID := stringField(body, "transaction_id", "id", "txn_id")
	amount := floatField(body, "amount", "transaction_amount")
	return &WebhookPayload{
		ExternalID: extID,
		Amount:     amount,
		Currency:   stringField(body, "currency", "currency_code"),
		PayerPhone: stringField(body, "msisdn", "payer_msisdn", "phone"),
		PayeePhone: stringField(body, "payee_msisdn", "merchant_msisdn"),
		Reference:  stringField(body, "reference", "narration", "note"),
		Provider:   ProviderAirtelMoney,
	}, nil
}

func stringField(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			switch t := v.(type) {
			case string:
				if t != "" {
					return t
				}
			case float64:
				return fmt.Sprintf("%.0f", t)
			}
		}
	}
	return ""
}

func floatField(m map[string]interface{}, keys ...string) float64 {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			switch t := v.(type) {
			case float64:
				return t
			case string:
				var f float64
				_, _ = fmt.Sscanf(t, "%f", &f)
				return f
			}
		}
	}
	return 0
}
