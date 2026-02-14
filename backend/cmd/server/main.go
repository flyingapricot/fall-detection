package main

import (
	"fall-detection/internal/config"
	"fall-detection/internal/mqtt"
	"fall-detection/internal/tcp"
)

func main() {

	// Load Constants
	config.Load()

	// Create mqtt client here
	publishClient := mqtt.CreateClient("publisher")

	go tcp.StartTcp(publishClient)

	select {} // Block forever
}
