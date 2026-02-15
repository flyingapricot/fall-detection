package main

import (
	"fall-detection/internal/alert"
	"fall-detection/internal/config"
	"fall-detection/internal/database"
	"fall-detection/internal/http"
	"fall-detection/internal/http/handlers"
	"fall-detection/internal/mqtt"
	"fall-detection/internal/repository"
	"fall-detection/internal/tcp"
	"log"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

func main() {

	config.Load()

	db, err := database.New(config.DatabaseURL)
	if err != nil {
		log.Fatal("Error creating database: ", err)
	}
	defer db.Close()

	subscriptionRepo := repository.NewSubscriptionRepo(db)
	alertClient := mqtt.CreateClient("alert-subscriber")
	alertService, err := alert.NewAlert(alertClient, subscriptionRepo, config.BotToken)
	if err != nil {
		log.Fatal("Error creating alert service: ", err)
	}
	alertService.Start()

	// Start listening for telegram commands
	go alertService.Bot.ListenForCommands(subscriptionRepo)


	publishClient := mqtt.CreateClient("publisher")
	tcpServer := tcp.NewTCPServer(":"+config.TCPPort, publishClient)

	// Define Route Handlers
	clients := map[string]pahomqtt.Client{
		"publisher": publishClient,
	}
	healthHandler := handlers.NewHealthHandler(clients)
	boardHandler := handlers.NewBoardHandler(tcpServer)
	subscribersHandler := handlers.NewSubscribersHandler(subscriptionRepo)

	httpServer := http.New(config.HTTPPort, healthHandler, boardHandler, subscribersHandler)

	go tcpServer.Start()
	go httpServer.Run()

	select {} // Block forever
}
