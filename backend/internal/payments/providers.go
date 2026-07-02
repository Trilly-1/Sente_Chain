package payments

import (
	"context"
	"errors"
	"fmt"
)

var ErrProviderNotConfigured = errors.New("payment provider API is not configured")

// RequestToPayInput is used when STK / collections is enabled (future live API call).
type RequestToPayInput struct {
	SaccoID      string
	MembershipID string
	Amount       float64
	Currency     string
	PayerPhone   string
	PayeePhone   string
	Reference    string
	Provider     string
}

// RequestToPayResult is returned after initiating a collection request.
type RequestToPayResult struct {
	ExternalID string `json:"external_id"`
	Status     string `json:"status"`
	Message    string `json:"message,omitempty"`
}

// MTNClient wraps MTN MoMo Collections API (plug in credentials when ready).
type MTNClient struct {
	cfg MTNConfig
}

func NewMTNClient(cfg MTNConfig) *MTNClient {
	return &MTNClient{cfg: cfg}
}

func (c *MTNClient) Configured() bool {
	return c.cfg.Enabled
}

// RequestToPay in providers.go delegates to mtn_client when configured — see mtn_client.go

// AirtelClient wraps Airtel Money collections API.
type AirtelClient struct {
	cfg AirtelConfig
}

func NewAirtelClient(cfg AirtelConfig) *AirtelClient {
	return &AirtelClient{cfg: cfg}
}

func (c *AirtelClient) Configured() bool {
	return c.cfg.Enabled
}

func (c *AirtelClient) RequestToPay(ctx context.Context, in *RequestToPayInput) (*RequestToPayResult, error) {
	if !c.cfg.Enabled {
		return nil, ErrProviderNotConfigured
	}
	if in == nil || in.Amount <= 0 {
		return nil, errors.New("invalid request to pay")
	}
	// TODO: call Airtel collections endpoint when credentials are live.
	return nil, fmt.Errorf("Airtel Money request-to-pay not wired yet — add live API credentials to env")
}

// ProviderGateway exposes configured payment providers.
type ProviderGateway struct {
	MTN    *MTNClient
	Airtel *AirtelClient
	cfg    ProvidersConfig
}

func NewProviderGateway(cfg ProvidersConfig) *ProviderGateway {
	return &ProviderGateway{
		MTN:    NewMTNClient(cfg.MTN),
		Airtel: NewAirtelClient(cfg.Airtel),
		cfg:    cfg,
	}
}

func (g *ProviderGateway) Status() IntegrationStatus {
	return g.cfg.Status()
}

func (g *ProviderGateway) VerifyMTNWebhook(signature string) bool {
	secret := g.cfg.MTN.WebhookSecret
	if secret == "" {
		return true
	}
	return signature != "" && signature == secret
}

func (g *ProviderGateway) VerifyAirtelWebhook(signature string) bool {
	secret := g.cfg.Airtel.WebhookSecret
	if secret == "" {
		return true
	}
	return signature != "" && signature == secret
}
