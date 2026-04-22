package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v4/pgxpool"
	"sentechain-backend/internal/auth"
	"sentechain-backend/internal/middleware"
	"sentechain-backend/internal/users"
	"sentechain-backend/pkg/response"
)

type Server struct {
	engine *gin.Engine
	pool   *pgxpool.Pool
	port   int
	server *http.Server
}

func New(port int, db *pgxpool.Pool) *Server {
	engine := gin.Default()
	srv := &Server{
		engine: engine,
		pool:   db,
		port:   port,
	}

	srv.registerRoutes()

	return srv
}

// registerRoutes sets up all HTTP routes
func (s *Server) registerRoutes() {
	// Health check - lightweight, no DB call
	s.engine.GET("/health", s.handleHealth)

	// Ready check - includes DB readiness
	s.engine.GET("/ready", s.handleReady)

	// Auth routes
	s.registerAuthRoutes()
}

// registerAuthRoutes sets up authentication routes
func (s *Server) registerAuthRoutes() {
	// Initialize auth repositories and service
	authRepo := auth.NewRepository(s.pool)
	userRepo := users.NewRepository(s.pool)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		// JWT_SECRET is required and must be configured in the environment
		panic("JWT_SECRET environment variable is not set")
	}

	service := auth.NewService(authRepo, userRepo, jwtSecret)
	handler := auth.NewHandler(service, userRepo)

	// Public auth endpoints
	authGroup := s.engine.Group("/auth")
	{
		authGroup.POST("/otp/send", handler.HandleSendOTP)
		authGroup.POST("/otp/verify", handler.HandleVerifyOTP)

		// Protected endpoint
		authGroup.GET("/me", middleware.AuthMiddleware(jwtSecret), handler.HandleGetMe)
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

	// Check database connectivity
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

// Start starts the HTTP server
func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.port)
	s.server = &http.Server{
		Addr:    addr,
		Handler: s.engine,
	}
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown() error {
	if s.server == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return s.server.Shutdown(ctx)
}
