package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

var (
	MQTTBroker   string
	MQTTPort     string
	MQTTUsername string
	MQTTPassword string
	HTTPPort     string
	TCPPort      string
	CORSOrigins  []string
)

func Load() {
	godotenv.Load("../../.env")

	MQTTBroker = os.Getenv("MQTT_BROKER")
	MQTTPort = os.Getenv("MQTT_PORT")
	MQTTUsername = os.Getenv("MQTT_USERNAME")
	MQTTPassword = os.Getenv("MQTT_PASSWORD")
	HTTPPort = os.Getenv("HTTP_PORT")
	TCPPort = os.Getenv("TCP_PORT")

	if origins := os.Getenv("CORS_ORIGINS"); origins != "" {
		CORSOrigins = strings.Split(origins, ",")
	}
}
