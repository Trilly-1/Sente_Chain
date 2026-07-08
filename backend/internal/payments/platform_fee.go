package payments

import (
	"math"
	"os"
	"strconv"
)

// PlatformFeeConfig is exposed to the frontend for transparent pricing.
type PlatformFeeConfig struct {
	FeePercent      float64 `json:"fee_percent"`
	FeeModel        string  `json:"fee_model"`
	Description     string  `json:"description"`
	AppliesTo       []string `json:"applies_to"`
	MaxRecommended  float64 `json:"max_recommended_percent"`
}

// PlatformFeePercent reads PLATFORM_FEE_PERCENT (default 1.5). Set via env on Render.
func PlatformFeePercent() float64 {
	raw := os.Getenv("PLATFORM_FEE_PERCENT")
	if raw == "" {
		return 1.5
	}
	p, err := strconv.ParseFloat(raw, 64)
	if err != nil || p < 0 || p > 25 {
		return 1.5
	}
	return p
}

func PlatformFeeConfigPublic() PlatformFeeConfig {
	return PlatformFeeConfig{
		FeePercent:     PlatformFeePercent(),
		FeeModel:       "net_deduction",
		Description:    "Service fee is deducted from the member's credited amount. The SACCO receives the net; platform fee is tracked for monthly settlement.",
		AppliesTo:      []string{"savings"},
		MaxRecommended: 2.5,
	}
}

// SplitGrossAmount returns net credited to member and platform fee from gross MoMo amount.
func SplitGrossAmount(gross float64) (net, fee float64) {
	if gross <= 0 {
		return 0, 0
	}
	pct := PlatformFeePercent()
	fee = roundMoney(gross * pct / 100)
	if fee >= gross {
		fee = 0
	}
	net = roundMoney(gross - fee)
	return net, fee
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}
