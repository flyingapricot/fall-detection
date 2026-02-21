package routes

import (
	"fall-detection/internal/http/handlers"

	"github.com/gin-gonic/gin"
)

func RegisterSubscribersRoutes(r *gin.Engine, subscribersHandler *handlers.SubscribersHandler) {
	r.GET("/boards/:boardID/subscribers", subscribersHandler.GetSubscribers)
}
