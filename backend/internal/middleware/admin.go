package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v4/pgxpool"
	"sentechain-backend/pkg/response"
)

// ProjectAdminMiddleware ensures the authenticated user is a project administrator
func ProjectAdminMiddleware(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, response.Error("unauthorized"))
			c.Abort()
			return
		}

		var isAdmin bool
		err := db.QueryRow(c.Request.Context(),
			`SELECT is_project_admin FROM users WHERE id = $1`, userID,
		).Scan(&isAdmin)
		if err != nil || !isAdmin {
			c.JSON(http.StatusForbidden, response.Error("project admin access required"))
			c.Abort()
			return
		}

		c.Next()
	}
}
