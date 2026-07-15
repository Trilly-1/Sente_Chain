package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const brevoAPIURL = "https://api.brevo.com/v3/smtp/email"

// Config holds Brevo sender settings.
type Config struct {
	APIKey      string
	SenderEmail string
	SenderName  string
	FrontendURL string
	Enabled     bool
}

// LoadConfigFromEnv reads Brevo settings from environment variables.
func LoadConfigFromEnv(getEnv func(string, string) string) Config {
	apiKey := strings.TrimSpace(getEnv("BREVO_API_KEY", ""))
	senderEmail := strings.TrimSpace(getEnv("BREVO_SENDER_EMAIL", ""))
	senderName := strings.TrimSpace(getEnv("BREVO_SENDER_NAME", "SenteChain"))
	frontendURL := strings.TrimRight(strings.TrimSpace(getEnv("FRONTEND_URL", "http://localhost:5173")), "/")

	return Config{
		APIKey:      apiKey,
		SenderEmail: senderEmail,
		SenderName:  senderName,
		FrontendURL: frontendURL,
		Enabled:     apiKey != "" && senderEmail != "",
	}
}

// Client sends transactional emails via Brevo.
type Client struct {
	cfg        Config
	httpClient *http.Client
}

func NewClient(cfg Config) *Client {
	return &Client{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *Client) Enabled() bool {
	return c.cfg.Enabled
}

func (c *Client) FrontendURL() string {
	return c.cfg.FrontendURL
}

type recipient struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type sendPayload struct {
	Sender      recipient `json:"sender"`
	To          []recipient `json:"to"`
	Subject     string    `json:"subject"`
	HTMLContent string    `json:"htmlContent"`
}

func (c *Client) send(toEmail, toName, subject, html string) error {
	if !c.cfg.Enabled {
		return fmt.Errorf("email service is not configured")
	}

	payload := sendPayload{
		Sender: recipient{
			Email: c.cfg.SenderEmail,
			Name:  c.cfg.SenderName,
		},
		To: []recipient{{
			Email: toEmail,
			Name:  toName,
		}},
		Subject:     subject,
		HTMLContent: html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode email payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, brevoAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create email request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api-key", c.cfg.APIKey)

	res, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		return fmt.Errorf("brevo API error (%d): %s", res.StatusCode, strings.TrimSpace(string(respBody)))
	}

	return nil
}

func (c *Client) SendVerificationEmail(toEmail, fullName, token string) error {
	link := fmt.Sprintf("%s/verify-email?token=%s", c.cfg.FrontendURL, token)
	subject := "Confirm your SenteChain account"
	html := fmt.Sprintf(`<p>Hi %s,</p>
<p>Thanks for joining SenteChain. Please confirm your email to activate your account:</p>
<p><a href="%s" style="display:inline-block;padding:12px 20px;background:#15803d;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Confirm email</a></p>
<p>Or copy this link: <a href="%s">%s</a></p>
<p>This link expires in 24 hours.</p>
<p>If you did not create this account, you can ignore this email.</p>`, escapeHTML(fullName), link, link, link)
	return c.send(toEmail, fullName, subject, html)
}

func (c *Client) SendPINResetEmail(toEmail, fullName, token string) error {
	link := fmt.Sprintf("%s/reset-pin?token=%s", c.cfg.FrontendURL, token)
	subject := "Reset your SenteChain PIN"
	html := fmt.Sprintf(`<p>Hi %s,</p>
<p>We received a request to reset your SenteChain PIN.</p>
<p><a href="%s" style="display:inline-block;padding:12px 20px;background:#15803d;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Reset PIN</a></p>
<p>Or copy this link: <a href="%s">%s</a></p>
<p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`, escapeHTML(fullName), link, link, link)
	return c.send(toEmail, fullName, subject, html)
}

func escapeHTML(s string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&quot;",
		"'", "&#39;",
	)
	return replacer.Replace(s)
}
