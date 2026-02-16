package alert

import (
	"context"
	"fall-detection/internal/repository"
	"fall-detection/internal/tcp"
	"log"
	"strings"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

type Alert struct {
	Client pahomqtt.Client
	Bot *Bot
	SubscriptionRepo *repository.SubscriptionRepo
	FallEventRepo *repository.FallEventRepo
}


func (a *Alert) Start() {
    log.Println("[Alert] Subscribing to fall-detection/+/alerts...")
    token := a.Client.Subscribe("fall-detection/+/alerts", 1, func(client pahomqtt.Client, msg pahomqtt.Message) {
		topic := msg.Topic()
		parts := strings.Split(topic, "/")
		boardID := parts[1]

		log.Printf("[Alert] Received: %s", msg.Topic())

		// 1. Check for existing active fall
		existing, err := a.FallEventRepo.GetActive(context.Background(), boardID)
		if err == nil && existing != nil {
			// Already an active fall, skip
			return
		}

		// 2. Create new fall event
		eventID, err := a.FallEventRepo.Create(context.Background(), boardID)
		if err != nil {
			log.Printf("Failed to create fall event: %v", err)
			return
		}

		// 3. Send alerts with inline button
		chatIDs, _, _, err := a.SubscriptionRepo.GetSubscribers(context.Background(), boardID)
		if err != nil {
			log.Printf("Failed to get subscribers for board %s: %v", boardID, err)
			return
		}

		for _, chatID := range chatIDs {
			a.Bot.SendFallAlert(chatID, boardID, eventID)
		}
    })
    token.Wait()
    if token.Error() != nil {
        log.Printf("[Alert] Subscribe FAILED: %v", token.Error())
    } else {
        log.Println("[Alert] Subscribe SUCCESS")
    }
}

func NewAlert(client pahomqtt.Client, subscriptionRepo *repository.SubscriptionRepo, fallEventRepo *repository.FallEventRepo, botToken string, tcpServer *tcp.TCPServer) (*Alert,error) {
	bot, err := NewBot(subscriptionRepo, botToken, tcpServer)
	if err != nil {
		return nil, err
	}
	return &Alert{
		Client: client,	
		Bot: bot,
		SubscriptionRepo: subscriptionRepo,
		FallEventRepo: fallEventRepo,
	}, nil
}