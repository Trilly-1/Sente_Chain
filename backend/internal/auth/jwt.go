package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

// Claims represents the JWT claims
type Claims struct {
	UserID string `json:"user_id"`
	Phone  string `json:"phone"`
	jwt.RegisteredClaims
}

// GenerateToken generates a new JWT token for a user
func GenerateToken(userID uuid.UUID, phone string, secret string, expiryHours int) (string, error) {
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET is not set")
	}

	expiryTime := time.Now().Add(time.Duration(expiryHours) * time.Hour)
	claims := &Claims{
		UserID: userID.String(),
		Phone:  phone,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiryTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ParseToken parses and validates a JWT token
func ParseToken(tokenString string, secret string) (*Claims, error) {
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET is not set")
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}
