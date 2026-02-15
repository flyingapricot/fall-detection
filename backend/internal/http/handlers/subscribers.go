package handlers

import (
	"fall-detection/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SubscribersHandler struct {
	subscriptionRepo *repository.SubscriptionRepo
}

func (h *SubscribersHandler) GetSubscribers(c *gin.Context) {
	// Filter the request from the context
	boardID := c.Param("boardID")
	chatIDs, firstNames, usernames, err := h.subscriptionRepo.GetSubscribers(c.Request.Context(),boardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(chatIDs) != len(firstNames) || len(chatIDs) != len(usernames) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Length of chatIDs, firstNames, and usernames do not match"})
		return
	}

	result := []gin.H{}
	for i := range chatIDs {
		result = append(result, gin.H{
			"chatID": chatIDs[i],
			"firstName": firstNames[i],
			"username": usernames[i],
		})
	}

	c.JSON(http.StatusOK, result)
}

func NewSubscribersHandler(subscriptionRepo *repository.SubscriptionRepo) *SubscribersHandler {
	return &SubscribersHandler{
		subscriptionRepo: subscriptionRepo,
	}
}