package transactions

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"sentechain-backend/internal/stellar"
	"sentechain-backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandleCreate(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")

	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	txn, err := h.service.Create(c.Request.Context(), actorUserID.(string), &req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "not authorized" || err.Error() == "you are not a member of this SACCO" {
			status = http.StatusForbidden
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, response.Success(txn))
}

func (h *Handler) HandleList(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	filter := ListFilter{
		SaccoID:      c.Query("sacco_id"),
		MembershipID: c.Query("membership_id"),
		Status:       c.Query("status"),
		Limit:        limit,
		Offset:       offset,
	}

	list, err := h.service.List(c.Request.Context(), actorUserID.(string), filter)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{"transactions": list}))
}

func (h *Handler) HandleGet(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")
	txnID := c.Param("transactionId")

	txn, err := h.service.Get(c.Request.Context(), actorUserID.(string), txnID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "transaction not found" {
			status = http.StatusNotFound
		} else if err.Error() == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(txn))
}

func (h *Handler) HandleAnchor(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")
	txnID := c.Param("transactionId")

	txn, err := h.service.Anchor(c.Request.Context(), actorUserID.(string), txnID)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, stellar.ErrNotConfigured) {
			status = http.StatusServiceUnavailable
		} else if err.Error() == "transaction not found" {
			status = http.StatusNotFound
		} else if err.Error() == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(txn))
}

func (h *Handler) HandleVerify(c *gin.Context) {
	actorUserID, _ := c.Get("user_id")
	txnID := c.Param("transactionId")

	result, err := h.service.Verify(c.Request.Context(), actorUserID.(string), txnID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "transaction not found" {
			status = http.StatusNotFound
		} else if err.Error() == "not authorized" {
			status = http.StatusForbidden
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}
