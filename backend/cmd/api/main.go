package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	// "time"

	"sentechain-backend/internal/config"
	"sentechain-backend/internal/database"
	"sentechain-backend/internal/server"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Create context
	ctx := context.Background()

	// Connect to database
	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer database.Close(db)

	// Create and start server
	srv := server.New(cfg.Port, db)

	// Start server in a goroutine
	go func() {
		if err := srv.Start(); err != nil {
			log.Printf("❌ Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	// Graceful shutdown
	srv.Shutdown()

	log.Println("✅ Server stopped gracefully")
}
