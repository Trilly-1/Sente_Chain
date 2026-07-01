package saccoops

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandleListMembers(c *gin.Context) {
	saccoID := c.Param("saccoId")
	status := c.Query("status")

	members, err := h.service.ListMembers(c.Request.Context(), saccoID, status)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{"members": members}))
}

func (h *Handler) HandleUpdateRole(c *gin.Context) {
	actorUserID := c.GetString("user_id")
	saccoID := c.Param("saccoId")
	membershipID := c.Param("membershipId")

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request body"))
		return
	}

	result, err := h.service.UpdateRole(c.Request.Context(), actorUserID, saccoID, membershipID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandleSuspend(c *gin.Context) {
	actorUserID := c.GetString("user_id")
	saccoID := c.Param("saccoId")
	membershipID := c.Param("membershipId")

	result, err := h.service.Suspend(c.Request.Context(), actorUserID, saccoID, membershipID)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandleActivate(c *gin.Context) {
	actorUserID := c.GetString("user_id")
	saccoID := c.Param("saccoId")
	membershipID := c.Param("membershipId")

	result, err := h.service.Activate(c.Request.Context(), actorUserID, saccoID, membershipID)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandlePublicSummary(c *gin.Context) {
	saccoID := c.Param("saccoId")

	summary, err := h.service.GetPublicSummary(c.Request.Context(), saccoID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(summary))
}

// StaffRoles returns roles allowed for read-only SACCO staff endpoints.
func StaffRoles() []string {
	return []string{memberships.RoleAdmin, memberships.RoleCashier}
}

// AdminOnlyRoles returns roles allowed for SACCO admin write endpoints.
func AdminOnlyRoles() []string {
	return []string{memberships.RoleAdmin}
}
