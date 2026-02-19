package routes

import (
	"fall-detection/internal/http/handlers"

	"github.com/gin-gonic/gin"
)

func RegisterFallEventsRoutes(r *gin.Engine, h *handlers.FallEventsHandler) {
	r.GET("/boards/:boardID/fall-events", h.GetFallEvents)
}
