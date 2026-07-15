package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"sentechain-backend/pkg/response"
)

// Handler handles auth HTTP requests
type Handler struct {
	service            *Service
	exposeOTPInResponse bool
}

// NewHandler creates a new auth handler
func NewHandler(service *Service, exposeOTPInResponse bool) *Handler {
	return &Handler{service: service, exposeOTPInResponse: exposeOTPInResponse}
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

	rawOTP, err := h.service.SendOTP(c.Request.Context(), req.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("failed to send OTP: "+err.Error()))
		return
	}

	resp := SendOTPResponse{Message: "OTP sent successfully"}
	if h.exposeOTPInResponse {
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

	token, user, err := h.service.VerifyOTP(c.Request.Context(), req.Phone, req.Code, req.FullName)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.Error(err.Error()))
		return
	}

	respData := VerifyOTPResponse{Token: token}
	respData.User.ID = user.ID.String()
	respData.User.FullName = user.FullName
	respData.User.Phone = user.Phone

	c.JSON(http.StatusOK, response.Success(respData))
}

// HandleRegister handles POST /auth/register
func (h *Handler) HandleRegister(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	resp, err := h.service.Register(c.Request.Context(), &req)
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(err.Error(), "already registered") {
			status = http.StatusConflict
		}
		c.JSON(status, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, response.Success(resp))
}

// HandleLogin handles POST /auth/login
func (h *Handler) HandleLogin(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	token, user, err := h.service.Login(c.Request.Context(), req.Phone, req.PIN)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(AuthTokenResponse{
		Token: token,
		User:  *user,
	}))
}

// HandleGetMe handles GET /auth/me (protected route)
func (h *Handler) HandleGetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, response.Error("unauthorized"))
		return
	}

	profile, err := h.service.BuildUserProfile(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(profile))
}

// HandleVerifyEmail handles POST /auth/email/verify
func (h *Handler) HandleVerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}
	if req.Token == "" {
		c.JSON(http.StatusBadRequest, response.Error("token is required"))
		return
	}

	token, user, err := h.service.VerifyEmail(c.Request.Context(), req.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(AuthTokenResponse{
		Token: token,
		User:  *user,
	}))
}

// HandleResendVerification handles POST /auth/email/resend
func (h *Handler) HandleResendVerification(c *gin.Context) {
	var req ResendVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	resp, err := h.service.ResendVerificationEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(resp))
}

// HandleForgotPIN handles POST /auth/pin/forgot
func (h *Handler) HandleForgotPIN(c *gin.Context) {
	var req ForgotPINRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	resp, err := h.service.ForgotPIN(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(resp))
}

// HandleResetPIN handles POST /auth/pin/reset
func (h *Handler) HandleResetPIN(c *gin.Context) {
	var req ResetPINRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request: "+err.Error()))
		return
	}

	resp, err := h.service.ResetPIN(c.Request.Context(), req.Token, req.PIN, req.ConfirmPIN)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(resp))
}
