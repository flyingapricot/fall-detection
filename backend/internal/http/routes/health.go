package routes

import (
	"fall-detection/internal/http/handlers"

	"github.com/gin-gonic/gin"
)

func RegisterHealthRoutes(r *gin.Engine, healthHandler handlers.HealthHandler) {
	health := r.Group("/health")
	{
		health.GET("/", healthHandler.GetHealth)
	}
}
