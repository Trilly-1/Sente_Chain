package onboarding

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"sentechain-backend/internal/documents"
	"sentechain-backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandleUploadDocuments(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, response.Error("unauthorized"))
		return
	}

	var req documents.UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	result, err := h.service.SubmitDocuments(c.Request.Context(), userID.(string), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, response.Success(result))
}

func (h *Handler) HandleGetStatus(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, response.Error("unauthorized"))
		return
	}

	result, err := h.service.GetStatus(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}
