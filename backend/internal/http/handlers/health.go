package handlers

import (
	"fall-detection/internal/mqtt"
	"net/http"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	Clients map[string]pahomqtt.Client
}

func NewHealthHandler(clients map[string]pahomqtt.Client) HealthHandler {
	return HealthHandler{
		Clients: clients,
	}
}

func (h HealthHandler) GetHealth(c *gin.Context) {
	timeout := 800 * time.Millisecond

	status := gin.H{}
	allOK := true

	for name, client := range h.Clients {
		res := mqtt.PingHealthCheck(client, timeout)

		status[name] = gin.H{
			"ok":         res.OK,
			"status":     res.Status,
			"connected":  res.Connected,
			"latency_ms": res.LatencyMs,
			"error":      res.Error,
		}

		if !res.OK {
			allOK = false
		}
	}

	code := http.StatusOK
	if !allOK {
		code = http.StatusServiceUnavailable // 503 if any client unhealthy
	}

	c.JSON(code, gin.H{
		"mqtt": gin.H{
			"ok":      allOK,
			"clients": status,
		},
	})
}
