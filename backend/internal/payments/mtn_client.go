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
	payerMSISDN := c.payerMSISDN(in.PayerPhone)

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

	status, reason := c.waitForStatus(ctx, token, referenceID)
	message := "Check your phone for the MTN MoMo payment prompt"
	if c.sandbox() {
		switch strings.ToUpper(status) {
		case "SUCCESSFUL":
			message = "Sandbox payment succeeded. No prompt is sent to a real phone."
		case "FAILED":
			message = paymentFailureMessage(reason, true)
		default:
			message = "Sandbox payment is still processing (" + status + ")."
		}
	}
	return &RequestToPayResult{
		ExternalID: referenceID,
		Status:     strings.ToLower(status),
		Message:    message,
	}, nil
}

func paymentFailureMessage(reason string, sandbox bool) string {
	r := strings.ToUpper(strings.TrimSpace(reason))
	if strings.Contains(r, "NOT_ENOUGH") || strings.Contains(r, "INSUFFICIENT") {
		return "Insufficient balance. Your MoMo wallet must cover the amount plus the fee."
	}
	if r == "" {
		r = "UNKNOWN"
	}
	if sandbox {
		return "Sandbox payment failed: " + r
	}
	return "Payment failed: " + r
}

func (c *MTNClient) sandbox() bool {
	return strings.EqualFold(c.cfg.TargetEnvironment, "sandbox")
}

func (c *MTNClient) payerMSISDN(phone string) string {
	if c.sandbox() && strings.TrimSpace(c.cfg.SandboxPayer) != "" {
		return digitsOnly(c.cfg.SandboxPayer)
	}
	return strings.TrimPrefix(NormalizePhone(phone), "+")
}

func digitsOnly(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func (c *MTNClient) waitForStatus(ctx context.Context, token, referenceID string) (string, string) {
	if !c.sandbox() {
		return "pending", ""
	}
	deadline := time.Now().Add(10 * time.Second)
	status, reason := "PENDING", ""
	for {
		st, rsn, err := c.getRequestStatus(ctx, token, referenceID)
		if err == nil && st != "" {
			status, reason = st, rsn
			upper := strings.ToUpper(st)
			if upper == "SUCCESSFUL" || upper == "FAILED" {
				return status, reason
			}
		}
		if time.Now().After(deadline) {
			return status, reason
		}
		select {
		case <-ctx.Done():
			return status, reason
		case <-time.After(2 * time.Second):
		}
	}
}

func (c *MTNClient) getRequestStatus(ctx context.Context, token, referenceID string) (string, string, error) {
	url := strings.TrimRight(c.cfg.BaseURL, "/") + "/collection/v1_0/requesttopay/" + referenceID
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Target-Environment", c.cfg.TargetEnvironment)
	req.Header.Set("Ocp-Apim-Subscription-Key", c.cfg.SubscriptionKey)

	client := &http.Client{Timeout: 20 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", "", fmt.Errorf("MTN status failed (%d)", res.StatusCode)
	}
	var parsed struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", "", err
	}
	return parsed.Status, parsed.Reason, nil
}
