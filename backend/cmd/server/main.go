package main

import (
	"fall-detection/internal/config"
	"fall-detection/internal/http"
	"fall-detection/internal/http/handlers"
	"fall-detection/internal/mqtt"
	"fall-detection/internal/tcp"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

func main() {

	config.Load()

	publishClient := mqtt.CreateClient("publisher")
	tcpServer := tcp.NewTCPServer(":"+config.TCPPort, publishClient)

	// Define Route Handlers
	clients := map[string]pahomqtt.Client{
		"publisher": publishClient,
	}
	healthHandler := handlers.NewHealthHandler(clients)
	boardHandler := handlers.NewBoardHandler(tcpServer)

	httpServer := http.New(config.HTTPPort, healthHandler, boardHandler)

	go tcpServer.Start()
	go httpServer.Run()

	select {} // Block forever
}
