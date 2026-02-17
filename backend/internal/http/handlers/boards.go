package handlers

import (
	"fall-detection/internal/tcp"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type BoardHandler struct {
	tcpServer *tcp.TCPServer
}

func NewBoardHandler(tcpServer *tcp.TCPServer) *BoardHandler {
	return &BoardHandler{
		tcpServer: tcpServer,
	}
}

func (h *BoardHandler) GetBoards(c *gin.Context) {
	boards := h.tcpServer.GetBoards()
	var result []gin.H
	for _, board := range boards {
		if time.Now().Sub(board.LastSeen) <= 2*time.Minute {
			result = append(result, gin.H{
				"ID":          board.ID,
				"ConnectedAt": board.ConnectedAt,
				"LastSeen":    board.LastSeen,
			})
		}
	}
	c.JSON(http.StatusOK, result)
}
