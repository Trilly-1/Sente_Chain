package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"sentechain-backend/internal/auth"
	"sentechain-backend/pkg/response"
)

// AuthMiddleware validates JWT tokens and adds claims to context
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, response.Error("missing authorization header"))
			c.Abort()
			return
		}

		// Token should be in format "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, response.Error("invalid authorization header format"))
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Parse and validate token using the auth package's ParseToken function
		claims, err := auth.ParseToken(tokenString, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, response.Error("invalid token"))
			c.Abort()
			return
		}

		// Add claims to context
		c.Set("user_id", claims.UserID)
		c.Set("phone", claims.Phone)

		c.Next()
	}
}
