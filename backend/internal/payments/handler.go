package payments

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"sentechain-backend/pkg/response"
)

type Handler struct {
	service  *Service
	providers *ProviderGateway
}

func NewHandler(service *Service, providers *ProviderGateway) *Handler {
	return &Handler{service: service, providers: providers}
}

func (h *Handler) HandleListAccounts(c *gin.Context) {
	saccoID := c.Param("saccoId")
	accounts, err := h.service.ListAccounts(c.Request.Context(), saccoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(gin.H{"accounts": accounts}))
}

func (h *Handler) HandleUpsertAccounts(c *gin.Context) {
	saccoID := c.Param("saccoId")
	var req UpsertAccountsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request body"))
		return
	}
	accounts, err := h.service.UpsertAccounts(c.Request.Context(), saccoID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(gin.H{"accounts": accounts}))
}

func (h *Handler) HandleMemberPaymentInstructions(c *gin.Context) {
	userID := c.GetString("user_id")
	saccoID := c.Query("sacco_id")
	if saccoID == "" {
		c.JSON(http.StatusBadRequest, response.Error("sacco_id query parameter is required"))
		return
	}
	instructions, err := h.service.GetInstructionsForMember(c.Request.Context(), userID, saccoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(instructions))
}

func (h *Handler) HandleRequestToPay(c *gin.Context) {
	userID := c.GetString("user_id")
	var req RequestToPayBody
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request body"))
		return
	}
	result, err := h.service.RequestToPay(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

func (h *Handler) HandleIntegrationStatus(c *gin.Context) {
	if h.providers == nil {
		c.JSON(http.StatusOK, response.Success(IntegrationStatus{WebhooksReady: true}))
		return
	}
	c.JSON(http.StatusOK, response.Success(h.providers.Status()))
}

func (h *Handler) HandleMTNWebhook(c *gin.Context) {
	if h.providers != nil && !h.providers.VerifyMTNWebhook(c.GetHeader("X-Callback-Signature")) {
		c.JSON(http.StatusUnauthorized, response.Error("invalid webhook signature"))
		return
	}
	body, err := readWebhookBody(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	payload, err := ParseMTNWebhook(body)
	if err != nil || payload.ExternalID == "" {
		c.JSON(http.StatusBadRequest, response.Error("invalid MTN webhook payload"))
		return
	}
	raw, _ := json.Marshal(body)
	event, err := h.service.ProcessInbound(c.Request.Context(), payload, raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(event))
}

func (h *Handler) HandleAirtelWebhook(c *gin.Context) {
	if h.providers != nil && !h.providers.VerifyAirtelWebhook(c.GetHeader("X-Airtel-Signature")) {
		c.JSON(http.StatusUnauthorized, response.Error("invalid webhook signature"))
		return
	}
	body, err := readWebhookBody(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	payload, err := ParseAirtelWebhook(body)
	if err != nil || payload.ExternalID == "" {
		c.JSON(http.StatusBadRequest, response.Error("invalid Airtel webhook payload"))
		return
	}
	raw, _ := json.Marshal(body)
	event, err := h.service.ProcessInbound(c.Request.Context(), payload, raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(event))
}

// HandleTestWebhook accepts a normalized payload for integration testing before live APIs.
func (h *Handler) HandleTestWebhook(c *gin.Context) {
	var payload WebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request body"))
		return
	}
	raw, _ := json.Marshal(payload)
	event, err := h.service.ProcessInbound(c.Request.Context(), &payload, raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(event))
}

func readWebhookBody(c *gin.Context) (map[string]interface{}, error) {
	data, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil, err
	}
	var body map[string]interface{}
	if err := json.Unmarshal(data, &body); err != nil {
		return nil, err
	}
	return body, nil
}
