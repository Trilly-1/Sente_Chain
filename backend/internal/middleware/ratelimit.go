package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"sentechain-backend/pkg/response"
)

// RateLimiter is a simple in-memory sliding-window limiter (per key, e.g. client IP).
type RateLimiter struct {
	mu    sync.Mutex
	hits  map[string][]time.Time
	limit int
	window time.Duration
}

// NewRateLimiter creates a limiter allowing max requests per window per key.
func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		hits:   make(map[string][]time.Time),
		limit:  max,
		window: window,
	}
}

func (rl *RateLimiter) allow(key string) bool {
	now := time.Now()
	cutoff := now.Add(-rl.window)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	times := rl.hits[key]
	filtered := times[:0]
	for _, t := range times {
		if t.After(cutoff) {
			filtered = append(filtered, t)
		}
	}
	if len(filtered) >= rl.limit {
		rl.hits[key] = filtered
		return false
	}
	rl.hits[key] = append(filtered, now)
	return true
}

// Middleware returns Gin middleware that rate-limits by client IP.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		if !rl.allow(key) {
			c.JSON(http.StatusTooManyRequests, response.Error("too many requests — try again later"))
			c.Abort()
			return
		}
		c.Next()
	}
}
