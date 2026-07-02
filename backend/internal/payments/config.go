package payments

import (
	"os"
	"strings"
)

// MTNConfig holds MTN MoMo Collections API credentials (platform-level merchant).
type MTNConfig struct {
	APIUser            string
	APIKey             string
	SubscriptionKey    string
	BaseURL            string
	CallbackURL        string
	TargetEnvironment  string
	Currency           string
	WebhookSecret      string
	Enabled            bool
}

// AirtelConfig holds Airtel Money API credentials.
type AirtelConfig struct {
	ClientID       string
	ClientSecret   string
	BaseURL        string
	CallbackURL    string
	Environment    string
	WebhookSecret  string
	Enabled        bool
}

// ProvidersConfig is loaded from environment when the project owner adds API keys.
type ProvidersConfig struct {
	MTN    MTNConfig
	Airtel AirtelConfig
}

// LoadProvidersConfigFromEnv reads MTN/Airtel settings. Empty vars mean not yet integrated.
func LoadProvidersConfigFromEnv() ProvidersConfig {
	mtnBase := strings.TrimSpace(os.Getenv("MTN_MOMO_BASE_URL"))
	if mtnBase == "" {
		mtnBase = "https://sandbox.momodeveloper.mtn.com"
	}
	airtelBase := strings.TrimSpace(os.Getenv("AIRTEL_BASE_URL"))
	if airtelBase == "" {
		airtelBase = "https://openapi.airtel.africa"
	}

	mtnUser := strings.TrimSpace(os.Getenv("MTN_MOMO_API_USER"))
	mtnKey := strings.TrimSpace(os.Getenv("MTN_MOMO_API_KEY"))
	mtnSub := strings.TrimSpace(os.Getenv("MTN_MOMO_SUBSCRIPTION_KEY"))

	airtelID := strings.TrimSpace(os.Getenv("AIRTEL_CLIENT_ID"))
	airtelSecret := strings.TrimSpace(os.Getenv("AIRTEL_CLIENT_SECRET"))

	mtnEnv := strings.TrimSpace(os.Getenv("MTN_MOMO_TARGET_ENVIRONMENT"))
	if mtnEnv == "" {
		mtnEnv = strings.TrimSpace(os.Getenv("MTN_MOMO_ENVIRONMENT"))
	}
	if mtnEnv == "" {
		mtnEnv = "sandbox"
	}

	airtelEnv := strings.TrimSpace(os.Getenv("AIRTEL_ENVIRONMENT"))
	if airtelEnv == "" {
		airtelEnv = "sandbox"
	}

	mtnCurrency := strings.TrimSpace(os.Getenv("MTN_MOMO_CURRENCY"))
	if mtnCurrency == "" {
		mtnCurrency = "UGX"
	}

	return ProvidersConfig{
		MTN: MTNConfig{
			APIUser:           mtnUser,
			APIKey:            mtnKey,
			SubscriptionKey:   mtnSub,
			BaseURL:           mtnBase,
			CallbackURL:       strings.TrimSpace(os.Getenv("MTN_MOMO_CALLBACK_URL")),
			TargetEnvironment: mtnEnv,
			Currency:          mtnCurrency,
			WebhookSecret:     strings.TrimSpace(os.Getenv("MTN_MOMO_WEBHOOK_SECRET")),
			Enabled:           mtnUser != "" && mtnKey != "" && mtnSub != "",
		},
		Airtel: AirtelConfig{
			ClientID:      airtelID,
			ClientSecret:  airtelSecret,
			BaseURL:       airtelBase,
			CallbackURL:   strings.TrimSpace(os.Getenv("AIRTEL_CALLBACK_URL")),
			Environment:   airtelEnv,
			WebhookSecret: strings.TrimSpace(os.Getenv("AIRTEL_WEBHOOK_SECRET")),
			Enabled:       airtelID != "" && airtelSecret != "",
		},
	}
}

// IntegrationStatus is safe to expose (no secrets).
type IntegrationStatus struct {
	MTNConfigured    bool   `json:"mtn_configured"`
	AirtelConfigured bool   `json:"airtel_configured"`
	MTNCallbackURL   string `json:"mtn_callback_url,omitempty"`
	AirtelCallbackURL string `json:"airtel_callback_url,omitempty"`
	MTNEnvironment   string `json:"mtn_environment,omitempty"`
	AirtelEnvironment string `json:"airtel_environment,omitempty"`
	WebhooksReady    bool   `json:"webhooks_ready"`
}

func (c ProvidersConfig) Status() IntegrationStatus {
	return IntegrationStatus{
		MTNConfigured:     c.MTN.Enabled,
		AirtelConfigured:  c.Airtel.Enabled,
		MTNCallbackURL:    c.MTN.CallbackURL,
		AirtelCallbackURL: c.Airtel.CallbackURL,
		MTNEnvironment:    c.MTN.TargetEnvironment,
		AirtelEnvironment: c.Airtel.Environment,
		WebhooksReady:     true,
	}
}
