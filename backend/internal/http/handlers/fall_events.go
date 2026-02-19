package handlers

import (
	"fall-detection/internal/repository"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type FallEventsHandler struct {
	fallEventRepo *repository.FallEventRepo
}

func NewFallEventsHandler(fallEventRepo *repository.FallEventRepo) *FallEventsHandler {
	return &FallEventsHandler{fallEventRepo: fallEventRepo}
}

type fallEventResponse struct {
	ID           int64      `json:"id"`
	BoardID      string     `json:"boardID"`
	DetectedAt   time.Time  `json:"detectedAt"`
	ResolvedAt   *time.Time `json:"resolvedAt"`
	Status       string     `json:"status"`
	DurationSecs *float64   `json:"durationSecs"`
}

func (h *FallEventsHandler) GetFallEvents(c *gin.Context) {
	boardID := c.Param("boardID")
	events, err := h.fallEventRepo.GetByBoard(c.Request.Context(), boardID, 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]fallEventResponse, 0, len(events))
	for _, e := range events {
		r := fallEventResponse{
			ID:         e.ID,
			BoardID:    e.BoardID,
			DetectedAt: e.DetectedAt,
			ResolvedAt: e.ResolvedAt,
			Status:     e.Status,
		}
		if e.ResolvedAt != nil {
			d := e.ResolvedAt.Sub(e.DetectedAt).Seconds()
			r.DurationSecs = &d
		}
		result = append(result, r)
	}

	c.JSON(http.StatusOK, result)
}
