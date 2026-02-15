package routes

import (
	"fall-detection/internal/http/handlers"

	"github.com/gin-gonic/gin"
)

func RegisterBoardRoutes(r *gin.Engine, boardHandler *handlers.BoardHandler) {
	boards := r.Group("/boards")
	{
		boards.GET("/connected", boardHandler.GetBoards)
	}

}
