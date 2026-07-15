package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// Config holds application configuration loaded from environment variables.
type Config struct {
	AppEnv                string
	Port                  int
	DatabaseURL           string
	MigrationsDatabaseURL string
	JWTSecret             string
	JWTExpiryHours        int
	CORSAllowedOrigins    string
	ExposeOTPInResponse   bool
	EnableDocs            bool
	AuthRateLimit         int
	AuthRateWindowSec     int
	BrevoAPIKey           string
	BrevoSenderEmail      string
	BrevoSenderName       string
	FrontendURL           string
	ExposeEmailLinksInResponse bool
}

// Load reads environment variables and returns a Config struct.
func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		AppEnv:                getEnv("APP_ENV", "development"),
		Port:                  getEnvInt("PORT", 8080),
		DatabaseURL:           getEnvRequired("DATABASE_URL"),
		MigrationsDatabaseURL: getEnv("MIGRATIONS_DATABASE_URL", ""),
		JWTSecret:             getEnvRequired("JWT_SECRET"),
		JWTExpiryHours:        getEnvInt("JWT_EXPIRY_HOURS", 24),
		CORSAllowedOrigins:    getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"),
		ExposeOTPInResponse:   getEnvBool("EXPOSE_OTP_IN_RESPONSE", false),
		EnableDocs:            getEnvBool("ENABLE_DOCS", getEnv("APP_ENV", "development") != "production"),
		AuthRateLimit:         getEnvInt("AUTH_RATE_LIMIT", 20),
		AuthRateWindowSec:     getEnvInt("AUTH_RATE_WINDOW_SEC", 60),
		BrevoAPIKey:           getEnv("BREVO_API_KEY", ""),
		BrevoSenderEmail:      getEnv("BREVO_SENDER_EMAIL", ""),
		BrevoSenderName:       getEnv("BREVO_SENDER_NAME", "SenteChain"),
		FrontendURL:           strings.TrimRight(getEnv("FRONTEND_URL", "http://localhost:5173"), "/"),
		ExposeEmailLinksInResponse: getEnvBool("EXPOSE_EMAIL_LINKS_IN_RESPONSE", false),
	}

	cfg.validate()
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	return cfg
}

func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

func (c *Config) validate() {
	weak := []string{"change-me", "secret", "jwt-secret", "replace-with-a-long-random-secret"}
	lower := strings.ToLower(c.JWTSecret)
	for _, w := range weak {
		if lower == w {
			log.Fatalf("❌ JWT_SECRET is too weak — generate with: openssl rand -hex 32")
		}
	}
	if len(c.JWTSecret) < 32 {
		log.Fatalf("❌ JWT_SECRET must be at least 32 characters")
	}
	if c.IsProduction() && c.ExposeOTPInResponse {
		log.Fatalf("❌ EXPOSE_OTP_IN_RESPONSE must be false in production")
	}
	if c.IsProduction() && c.ExposeEmailLinksInResponse {
		log.Fatalf("❌ EXPOSE_EMAIL_LINKS_IN_RESPONSE must be false in production")
	}
	if c.IsProduction() && (c.FrontendURL == "" || strings.Contains(c.FrontendURL, "localhost")) {
		log.Fatalf("❌ FRONTEND_URL must be set to your production web app URL in production (e.g. https://sentechain.vercel.app)")
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		switch strings.ToLower(value) {
		case "1", "true", "yes", "on":
			return true
		case "0", "false", "no", "off":
			return false
		}
	}
	return defaultValue
}

func getEnvRequired(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("❌ Required environment variable not set: %s", key)
	}
	return value
}
