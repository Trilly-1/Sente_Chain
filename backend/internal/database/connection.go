package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v4/pgxpool"
)

// Pool is the database connection pool
var pool *pgxpool.Pool

// Connect creates a new database connection pool
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	var err error
	pool, err = pgxpool.Connect(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Ping the database to verify connection
	err = pool.Ping(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return pool, nil
}

// Close closes the database connection pool
func Close(p *pgxpool.Pool) {
	if p != nil {
		p.Close()
	}
}

// Ping checks if database is ready
func Ping(ctx context.Context, p *pgxpool.Pool) error {
	if p == nil {
		return fmt.Errorf("database pool is nil")
	}
	return p.Ping(ctx)
}
