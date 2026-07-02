package publicstats

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"sentechain-backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandleGetStats(c *gin.Context) {
	country := strings.TrimSpace(c.Query("country"))

	stats, err := h.service.GetPlatformStats(c.Request.Context(), country)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(stats))
}
