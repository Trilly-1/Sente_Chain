package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds application configuration
type Config struct {
	AppEnv                string
	Port                  int
	DatabaseURL           string
	MigrationsDatabaseURL string
	JWTSecret             string
}

// Load reads environment variables and returns a Config struct
func Load() *Config {
	// Load .env file (optional, won't fail if missing)
	_ = godotenv.Load()

	cfg := &Config{
		AppEnv:                getEnv("APP_ENV", "development"),
		Port:                  getEnvInt("PORT", 8080),
		DatabaseURL:           getEnvRequired("DATABASE_URL"),
		MigrationsDatabaseURL: getEnv("MIGRATIONS_DATABASE_URL", ""),
		JWTSecret:             getEnv("JWT_SECRET", "change-me"),
	}

	return cfg
}

// getEnv returns an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt returns an environment variable as int with a default value
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// getEnvRequired returns an environment variable or panics if not set
func getEnvRequired(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("❌ Required environment variable not set: %s", key)
	}
	return value
}
