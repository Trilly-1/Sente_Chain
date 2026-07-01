package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/pkg/response"
)

// SaccoStaffMiddleware ensures the user is an active admin or cashier of the SACCO in :saccoId.
func SaccoStaffMiddleware(db *pgxpool.Pool, allowedRoles ...string) gin.HandlerFunc {
	if len(allowedRoles) == 0 {
		allowedRoles = []string{memberships.RoleAdmin, memberships.RoleCashier}
	}

	roleSet := make(map[string]struct{}, len(allowedRoles))
	for _, r := range allowedRoles {
		roleSet[r] = struct{}{}
	}

	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, response.Error("unauthorized"))
			c.Abort()
			return
		}

		saccoID := c.Param("saccoId")
		if saccoID == "" {
			c.JSON(http.StatusBadRequest, response.Error("sacco id is required"))
			c.Abort()
			return
		}

		var isProjectAdmin bool
		_ = db.QueryRow(c.Request.Context(),
			`SELECT is_project_admin FROM users WHERE id = $1`, userID,
		).Scan(&isProjectAdmin)
		if isProjectAdmin {
			c.Set("sacco_role", "project_admin")
			c.Next()
			return
		}

		var role, status string
		var membershipID string
		err := db.QueryRow(c.Request.Context(), `
			SELECT id, role, status FROM sacco_memberships
			WHERE user_id = $1 AND sacco_id = $2
		`, userID, saccoID).Scan(&membershipID, &role, &status)
		if err != nil {
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusForbidden, response.Error("not a member of this SACCO"))
				c.Abort()
				return
			}
			c.JSON(http.StatusInternalServerError, response.Error("failed to verify SACCO membership"))
			c.Abort()
			return
		}

		if status != memberships.StatusActive {
			c.JSON(http.StatusForbidden, response.Error("your SACCO membership must be active"))
			c.Abort()
			return
		}

		if _, ok := roleSet[role]; !ok {
			c.JSON(http.StatusForbidden, response.Error("insufficient SACCO role"))
			c.Abort()
			return
		}

		c.Set("sacco_membership_id", membershipID)
		c.Set("sacco_role", role)
		c.Next()
	}
}
