package middleware

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

// CacheControl sets Cache-Control for successful GET responses (for CDN / Render edge caching).
func CacheControl(maxAgeSeconds int) gin.HandlerFunc {
	value := fmt.Sprintf("public, max-age=%d, stale-while-revalidate=60", maxAgeSeconds)
	return func(c *gin.Context) {
		c.Next()
		if c.Request.Method == "GET" && c.Writer.Status() < 400 {
			c.Header("Cache-Control", value)
		}
	}
}
