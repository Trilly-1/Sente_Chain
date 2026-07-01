package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"sentechain-backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandleListPendingMembers(c *gin.Context) {
	members, err := h.service.ListPendingMembers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{"members": members}))
}

func (h *Handler) HandleApproveMember(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")
	membershipID := c.Param("memberId")

	result, err := h.service.ApproveMember(c.Request.Context(), actorUserID.(string), membershipID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "membership not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandleRejectMember(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")
	membershipID := c.Param("memberId")

	var req RejectRequest
	_ = c.ShouldBindJSON(&req)

	result, err := h.service.RejectMember(c.Request.Context(), actorUserID.(string), membershipID, req.Reason)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "membership not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandleListAuditLogs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	logs, total, err := h.service.ListAuditLogs(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{
		"logs":  logs,
		"total": total,
	}))
}

func (h *Handler) HandleListPendingSaccos(c *gin.Context) {
	saccos, err := h.service.ListPendingSaccos(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(gin.H{"saccos": saccos}))
}

func (h *Handler) HandleApproveSacco(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")
	saccoID := c.Param("saccoId")

	result, err := h.service.ApproveSacco(c.Request.Context(), actorUserID.(string), saccoID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "SACCO not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandleRejectSacco(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")
	saccoID := c.Param("saccoId")

	var req RejectRequest
	_ = c.ShouldBindJSON(&req)

	result, err := h.service.RejectSacco(c.Request.Context(), actorUserID.(string), saccoID, req.Reason)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "SACCO not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}
