package payments

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (c *MTNClient) getAccessToken(ctx context.Context) (string, error) {
	url := strings.TrimRight(c.cfg.BaseURL, "/") + "/collection/token/"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		return "", err
	}
	credentials := base64.StdEncoding.EncodeToString([]byte(c.cfg.APIUser + ":" + c.cfg.APIKey))
	req.Header.Set("Authorization", "Basic "+credentials)
	req.Header.Set("Ocp-Apim-Subscription-Key", c.cfg.SubscriptionKey)

	client := &http.Client{Timeout: 30 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("MTN token request failed (%d): %s", res.StatusCode, string(body))
	}

	var parsed struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", err
	}
	if parsed.AccessToken == "" {
		return "", fmt.Errorf("MTN token response missing access_token")
	}
	return parsed.AccessToken, nil
}

func (c *MTNClient) RequestToPay(ctx context.Context, in *RequestToPayInput) (*RequestToPayResult, error) {
	if !c.cfg.Enabled {
		return nil, ErrProviderNotConfigured
	}
	if in == nil || in.Amount <= 0 {
		return nil, fmt.Errorf("invalid request to pay")
	}

	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("MTN auth failed: %w", err)
	}

	referenceID := uuid.New().String()
	payerMSISDN := strings.TrimPrefix(NormalizePhone(in.PayerPhone), "+")

	payload := map[string]interface{}{
		"amount":     fmt.Sprintf("%.0f", in.Amount),
		"currency":   c.cfg.Currency,
		"externalId": referenceID,
		"payer": map[string]string{
			"partyIdType": "MSISDN",
			"partyId":     payerMSISDN,
		},
		"payerMessage": in.Reference,
		"payeeNote":    fmt.Sprintf("SenteChain deposit %s", in.Reference),
	}
	b, _ := json.Marshal(payload)

	url := strings.TrimRight(c.cfg.BaseURL, "/") + "/collection/v1_0/requesttopay"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Reference-Id", referenceID)
	req.Header.Set("X-Target-Environment", c.cfg.TargetEnvironment)
	req.Header.Set("Ocp-Apim-Subscription-Key", c.cfg.SubscriptionKey)
	req.Header.Set("Content-Type", "application/json")
	if c.cfg.CallbackURL != "" {
		req.Header.Set("X-Callback-Url", c.cfg.CallbackURL)
	}

	client := &http.Client{Timeout: 45 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	resBody, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusAccepted && res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("MTN request-to-pay failed (%d): %s", res.StatusCode, string(resBody))
	}

	return &RequestToPayResult{
		ExternalID: referenceID,
		Status:     "pending",
		Message:    "Check your phone for the MTN MoMo payment prompt",
	}, nil
}
