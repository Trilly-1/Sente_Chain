package server

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerDocsRoutes() {
	s.engine.GET("/openapi.yaml", s.handleOpenAPISpec)
	s.engine.GET("/docs", s.handleSwaggerUI)
}

func (s *Server) handleOpenAPISpec(c *gin.Context) {
	path := filepath.Join("openapi", "openapi.yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "openapi spec not found"})
		return
	}
	c.Data(http.StatusOK, "application/yaml; charset=utf-8", data)
}

func (s *Server) handleSwaggerUI(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(swaggerHTML))
}

const swaggerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SenteChain API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
      });
    };
  </script>
</body>
</html>`
