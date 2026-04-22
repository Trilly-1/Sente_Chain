package auth

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"sentechain-backend/internal/users"
	"sentechain-backend/pkg/response"
)

// Handler handles auth HTTP requests
type Handler struct {
	service  *Service
	userRepo *users.Repository
}

// NewHandler creates a new auth handler
func NewHandler(service *Service, userRepo *users.Repository) *Handler {
	return &Handler{
		service:  service,
		userRepo: userRepo,
	}
}

// HandleSendOTP handles POST /auth/otp/send
func (h *Handler) HandleSendOTP(c *gin.Context) {
	var req SendOTPRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	if req.Phone == "" {
		c.JSON(http.StatusBadRequest, response.Error("phone is required"))
		return
	}

	// Send OTP
	rawOTP, err := h.service.SendOTP(c.Request.Context(), req.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("failed to send OTP: "+err.Error()))
		return
	}

	// Build response
	resp := SendOTPResponse{
		Message: "OTP sent successfully",
	}

	// Include raw OTP in development mode only
	if os.Getenv("APP_ENV") == "development" {
		resp.RawOTP = rawOTP
	}

	c.JSON(http.StatusOK, response.Success(resp))
}

// HandleVerifyOTP handles POST /auth/otp/verify
func (h *Handler) HandleVerifyOTP(c *gin.Context) {
	var req VerifyOTPRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	if req.Phone == "" {
		c.JSON(http.StatusBadRequest, response.Error("phone is required"))
		return
	}

	if req.Code == "" {
		c.JSON(http.StatusBadRequest, response.Error("code is required"))
		return
	}

	// Verify OTP and issue token
	token, user, err := h.service.VerifyOTP(c.Request.Context(), req.Phone, req.Code, req.FullName)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.Error(err.Error()))
		return
	}

	// Build response
	respData := VerifyOTPResponse{
		Token: token,
	}
	respData.User.ID = user.ID.String()
	respData.User.FullName = user.FullName
	respData.User.Phone = user.Phone

	c.JSON(http.StatusOK, response.Success(respData))
}

// HandleGetMe handles GET /auth/me (protected route)
func (h *Handler) HandleGetMe(c *gin.Context) {
	// Extract user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, response.Error("unauthorized"))
		return
	}

	userIDStr, ok := userID.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, response.Error("invalid user context"))
		return
	}

	// Fetch the actual user from the repository
	user, err := h.userRepo.GetByID(c.Request.Context(), userIDStr)
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error("user not found"))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{
		"id":        user.ID.String(),
		"full_name": user.FullName,
		"phone":     user.Phone,
		"email":     user.Email,
	}))
}
