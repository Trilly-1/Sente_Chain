package server

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v4/pgxpool"
	"sentechain-backend/internal/admin"
	"sentechain-backend/internal/audit"
	"sentechain-backend/internal/auth"
	"sentechain-backend/internal/config"
	"sentechain-backend/internal/documents"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/internal/middleware"
	"sentechain-backend/internal/onboarding"
	"sentechain-backend/internal/sacco"
	"sentechain-backend/internal/saccoops"
	"sentechain-backend/internal/stellar"
	"sentechain-backend/internal/transactions"
	"sentechain-backend/internal/users"
	"sentechain-backend/pkg/response"
)

type Server struct {
	engine *gin.Engine
	pool   *pgxpool.Pool
	cfg    *config.Config
	server *http.Server
}

func New(cfg *config.Config, db *pgxpool.Pool) *Server {
	engine := gin.Default()
	srv := &Server{
		engine: engine,
		pool:   db,
		cfg:    cfg,
	}

	engine.Use(middleware.SecurityHeaders())
	engine.Use(middleware.CORS(cfg.CORSAllowedOrigins))

	srv.registerRoutes()

	return srv
}

func (s *Server) registerRoutes() {
	s.engine.GET("/health", s.handleHealth)
	s.engine.GET("/ready", s.handleReady)

	s.registerAuthRoutes()
	if s.cfg.EnableDocs {
		s.registerDocsRoutes()
	}
	s.registerSaccoRoutes()
	s.registerOnboardingRoutes()
	s.registerTransactionRoutes()
	s.registerSaccoOpsRoutes()
	s.registerAdminRoutes()
}

func (s *Server) registerTransactionRoutes() {
	jwtSecret := s.jwtSecret()

	txnRepo := transactions.NewRepository(s.pool)
	membershipRepo := memberships.NewRepository(s.pool)
	saccoRepo := sacco.NewRepository(s.pool)
	userRepo := users.NewRepository(s.pool)
	auditRepo := audit.NewRepository(s.pool)
	stellarSvc := stellar.NewService(stellar.LoadConfigFromEnv())

	service := transactions.NewService(txnRepo, membershipRepo, saccoRepo, userRepo, auditRepo, stellarSvc)
	handler := transactions.NewHandler(service)

	txnGroup := s.engine.Group("/transactions", middleware.AuthMiddleware(jwtSecret))
	{
		txnGroup.POST("", handler.HandleCreate)
		txnGroup.GET("", handler.HandleList)
		txnGroup.GET("/:transactionId", handler.HandleGet)
		txnGroup.POST("/:transactionId/anchor", handler.HandleAnchor)
		txnGroup.GET("/:transactionId/verify", handler.HandleVerify)
	}
}

func (s *Server) jwtSecret() string {
	return s.cfg.JWTSecret
}

func (s *Server) registerAuthRoutes() {
	authRepo := auth.NewRepository(s.pool)
	userRepo := users.NewRepository(s.pool)
	membershipRepo := memberships.NewRepository(s.pool)
	saccoRepo := sacco.NewRepository(s.pool)

	jwtSecret := s.jwtSecret()
	service := auth.NewService(authRepo, userRepo, membershipRepo, saccoRepo, jwtSecret, s.cfg.JWTExpiryHours)
	handler := auth.NewHandler(service, s.cfg.ExposeOTPInResponse)

	authLimiter := middleware.NewRateLimiter(s.cfg.AuthRateLimit, time.Duration(s.cfg.AuthRateWindowSec)*time.Second)

	authGroup := s.engine.Group("/auth", authLimiter.Middleware())
	{
		authGroup.POST("/register", handler.HandleRegister)
		authGroup.POST("/login", handler.HandleLogin)
		authGroup.POST("/otp/send", handler.HandleSendOTP)
		authGroup.POST("/otp/verify", handler.HandleVerifyOTP)
		authGroup.GET("/me", middleware.AuthMiddleware(jwtSecret), handler.HandleGetMe)
	}
}

func (s *Server) registerSaccoRoutes() {
	jwtSecret := s.jwtSecret()
	saccoRepo := sacco.NewRepository(s.pool)
	membershipRepo := memberships.NewRepository(s.pool)
	documentRepo := documents.NewRepository(s.pool)
	service := sacco.NewService(saccoRepo, membershipRepo, documentRepo)
	handler := sacco.NewHandler(service)

	// Public list of approved SACCOs for member signup
	s.engine.GET("/saccos", middleware.CacheControl(300), handler.HandleListApproved)
	s.registerSaccoOpsPublicRoutes()

	saccoGroup := s.engine.Group("/saccos", middleware.AuthMiddleware(jwtSecret))
	{
		saccoGroup.POST("", handler.HandleCreate)
		saccoGroup.GET("/:saccoId", handler.HandleGet)
		saccoGroup.PATCH("/:saccoId", handler.HandleUpdate)
		saccoGroup.POST("/:saccoId/documents", handler.HandleUploadDocuments)
		saccoGroup.POST("/:saccoId/submit", handler.HandleSubmit)
		saccoGroup.GET("/:saccoId/status", handler.HandleGetStatus)
	}
}

func (s *Server) registerSaccoOpsPublicRoutes() {
	userRepo := users.NewRepository(s.pool)
	membershipRepo := memberships.NewRepository(s.pool)
	saccoRepo := sacco.NewRepository(s.pool)
	txnRepo := transactions.NewRepository(s.pool)
	auditRepo := audit.NewRepository(s.pool)

	service := saccoops.NewService(userRepo, membershipRepo, saccoRepo, txnRepo, auditRepo)
	handler := saccoops.NewHandler(service)

	s.engine.GET("/saccos/:saccoId/public", middleware.CacheControl(60), handler.HandlePublicSummary)
}

func (s *Server) registerSaccoOpsRoutes() {
	jwtSecret := s.jwtSecret()

	userRepo := users.NewRepository(s.pool)
	membershipRepo := memberships.NewRepository(s.pool)
	saccoRepo := sacco.NewRepository(s.pool)
	txnRepo := transactions.NewRepository(s.pool)
	auditRepo := audit.NewRepository(s.pool)

	service := saccoops.NewService(userRepo, membershipRepo, saccoRepo, txnRepo, auditRepo)
	handler := saccoops.NewHandler(service)

	staffGroup := s.engine.Group("/saccos/:saccoId",
		middleware.AuthMiddleware(jwtSecret),
		middleware.SaccoStaffMiddleware(s.pool, saccoops.StaffRoles()...),
	)
	{
		staffGroup.GET("/members", handler.HandleListMembers)
	}

	adminGroup := s.engine.Group("/saccos/:saccoId",
		middleware.AuthMiddleware(jwtSecret),
		middleware.SaccoStaffMiddleware(s.pool, saccoops.AdminOnlyRoles()...),
	)
	{
		adminGroup.PATCH("/members/:membershipId/role", handler.HandleUpdateRole)
		adminGroup.PATCH("/members/:membershipId/suspend", handler.HandleSuspend)
		adminGroup.PATCH("/members/:membershipId/activate", handler.HandleActivate)
	}
}

func (s *Server) registerOnboardingRoutes() {
	jwtSecret := s.jwtSecret()
	membershipRepo := memberships.NewRepository(s.pool)
	documentRepo := documents.NewRepository(s.pool)
	service := onboarding.NewService(membershipRepo, documentRepo)
	handler := onboarding.NewHandler(service)

	membersGroup := s.engine.Group("/members/onboarding", middleware.AuthMiddleware(jwtSecret))
	{
		membersGroup.POST("/documents", handler.HandleUploadDocuments)
		membersGroup.GET("/status", handler.HandleGetStatus)
	}
}

func (s *Server) registerAdminRoutes() {
	jwtSecret := s.jwtSecret()

	userRepo := users.NewRepository(s.pool)
	membershipRepo := memberships.NewRepository(s.pool)
	saccoRepo := sacco.NewRepository(s.pool)
	documentRepo := documents.NewRepository(s.pool)
	auditRepo := audit.NewRepository(s.pool)

	service := admin.NewService(userRepo, membershipRepo, saccoRepo, documentRepo, auditRepo)
	handler := admin.NewHandler(service)

	adminGroup := s.engine.Group("/admin",
		middleware.AuthMiddleware(jwtSecret),
		middleware.ProjectAdminMiddleware(s.pool),
	)
	{
		adminGroup.GET("/members/pending", handler.HandleListPendingMembers)
		adminGroup.PATCH("/members/:memberId/approve", handler.HandleApproveMember)
		adminGroup.PATCH("/members/:memberId/reject", handler.HandleRejectMember)
		adminGroup.GET("/saccos/pending", handler.HandleListPendingSaccos)
		adminGroup.PATCH("/saccos/:saccoId/approve", handler.HandleApproveSacco)
		adminGroup.PATCH("/saccos/:saccoId/reject", handler.HandleRejectSacco)
		adminGroup.GET("/audit-logs", handler.HandleListAuditLogs)
	}
}

func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, response.Success(gin.H{
		"status":  "ok",
		"service": "sentechain-backend",
	}))
}

func (s *Server) handleReady(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := s.pool.Ping(ctx)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, response.Error("database not ready"))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{
		"status":   "ready",
		"database": "connected",
	}))
}

func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.cfg.Port)
	s.server = &http.Server{
		Addr:    addr,
		Handler: s.engine,
	}
	return s.server.ListenAndServe()
}

func (s *Server) Shutdown() error {
	if s.server == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return s.server.Shutdown(ctx)
}
