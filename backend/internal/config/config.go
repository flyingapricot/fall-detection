package config

import (
	"os"

	"github.com/joho/godotenv"
)

var (
	MQTTBroker   string
	MQTTPort     string
	MQTTUsername string
	MQTTPassword string
)

func Load() {
	godotenv.Load("../../.env")

	MQTTBroker = os.Getenv("MQTT_BROKER")
	MQTTPort = os.Getenv("MQTT_PORT")
	MQTTUsername = os.Getenv("MQTT_USERNAME")
	MQTTPassword = os.Getenv("MQTT_PASSWORD")
}
