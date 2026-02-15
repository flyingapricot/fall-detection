package mqtt

import (
	"fmt"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type PingHealth struct {
	OK        bool
	Status    string
	Connected bool
	LatencyMs int64
	Error     string
}

func PingHealthCheck(client mqtt.Client, timeout time.Duration) PingHealth {
	if client == nil || !client.IsConnected() {
		return PingHealth{OK: false, Status: "disconnected", Connected: false}
	}

	start := time.Now()
	topic := "health/ping"
	payload := fmt.Sprintf(`{"ts":%d}`, time.Now().Unix())

	token := client.Publish(topic, 0, false, payload)

	// Wait for publish to complete (or timeout)
	if !token.WaitTimeout(timeout) {
		return PingHealth{
			OK:        false,
			Status:    "timeout",
			Connected: true,
			Error:     "publish timeout",
		}
	}
	if err := token.Error(); err != nil {
		return PingHealth{
			OK:        false,
			Status:    "error",
			Connected: true,
			Error:     err.Error(),
		}
	}

	return PingHealth{
		OK:        true,
		Status:    "ok",
		Connected: true,
		LatencyMs: time.Since(start).Milliseconds(),
	}
}
