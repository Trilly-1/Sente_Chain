package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

// Pool is the database connection pool
var pool *pgxpool.Pool

// Connect creates a new database connection pool.
//
// The app uses Neon's pooled host, which is PgBouncer in transaction mode.
// pgx's default prepared statements make that pooler close the socket, and the
// next phone check then fails with "unexpected EOF". Simple protocol avoids
// the statement cache. A short idle time and a ping before each use stop the
// pool from handing out a connection Neon has already closed.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(normalizeDatabaseURL(databaseURL))
	if err != nil {
		return nil, fmt.Errorf("failed to parse database url: %w", err)
	}

	cfg.ConnConfig.PreferSimpleProtocol = true
	cfg.MaxConnIdleTime = 30 * time.Second
	cfg.MaxConnLifetime = 5 * time.Minute
	cfg.HealthCheckPeriod = 30 * time.Second
	cfg.BeforeAcquire = func(ctx context.Context, conn *pgx.Conn) bool {
		return conn.Ping(ctx) == nil
	}

	pool, err = pgxpool.ConnectConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err = pool.Ping(ctx); err != nil {
		pool.Close()
		pool = nil
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return pool, nil
}

// normalizeDatabaseURL drops channel_binding. Neon adds it to connection
// strings, and pgx v4 forwards unknown query params to the server, which
// makes the pooler drop the connection.
func normalizeDatabaseURL(raw string) string {
	parts := strings.SplitN(raw, "?", 2)
	if len(parts) != 2 {
		return raw
	}
	var kept []string
	for _, param := range strings.Split(parts[1], "&") {
		if param == "" || strings.HasPrefix(param, "channel_binding=") {
			continue
		}
		kept = append(kept, param)
	}
	if len(kept) == 0 {
		return parts[0]
	}
	return parts[0] + "?" + strings.Join(kept, "&")
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
