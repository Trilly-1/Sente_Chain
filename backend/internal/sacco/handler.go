package sacco

import (
	"net/http"
	"strings"

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

func (h *Handler) HandleListApproved(c *gin.Context) {
	name := strings.TrimSpace(c.Query("name"))
	country := strings.TrimSpace(c.Query("country"))

	list, err := h.service.ListApproved(c.Request.Context(), name, country)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(gin.H{"saccos": list}))
}

func (h *Handler) HandleCreate(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req CreateApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	result, err := h.service.CreateDraft(c.Request.Context(), userID.(string), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, response.Success(result))
}

func (h *Handler) HandleGet(c *gin.Context) {
	userID, _ := c.Get("user_id")
	saccoID := c.Param("saccoId")

	result, err := h.service.GetDetail(c.Request.Context(), userID.(string), saccoID)
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

func (h *Handler) HandleUpdate(c *gin.Context) {
	userID, _ := c.Get("user_id")
	saccoID := c.Param("saccoId")

	var req UpdateApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	result, err := h.service.UpdateDraft(c.Request.Context(), userID.(string), saccoID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandleUploadDocuments(c *gin.Context) {
	userID, _ := c.Get("user_id")
	saccoID := c.Param("saccoId")

	var req documents.UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	if err := h.service.UploadDocuments(c.Request.Context(), userID.(string), saccoID, &req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, response.Success(gin.H{"message": "documents recorded"}))
}

func (h *Handler) HandleSubmit(c *gin.Context) {
	userID, _ := c.Get("user_id")
	saccoID := c.Param("saccoId")

	result, err := h.service.Submit(c.Request.Context(), userID.(string), saccoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandleGetStatus(c *gin.Context) {
	userID, _ := c.Get("user_id")
	saccoID := c.Param("saccoId")

	result, err := h.service.GetStatus(c.Request.Context(), userID.(string), saccoID)
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
