package alert

import (
	"context"
	"fall-detection/internal/repository"
	"fall-detection/internal/tcp"
	"log"
	"strings"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

const fallEventTTL = 30 * time.Second

type Alert struct {
	Client pahomqtt.Client
	Bot *Bot
	SubscriptionRepo *repository.SubscriptionRepo
	FallEventRepo *repository.FallEventRepo
}


func (a *Alert) Start() {
    log.Printf("[Alert] Client connected: %v", a.Client.IsConnected())
    if !a.Client.IsConnected() {
        log.Println("[Alert] ERROR: MQTT client not connected!")
        return
    }
    log.Println("[Alert] Subscribing to fall-detection/+/alerts...")
    token := a.Client.Subscribe("fall-detection/+/alerts", 1, func(client pahomqtt.Client, msg pahomqtt.Message) {
		topic := msg.Topic()
		parts := strings.Split(topic, "/")
		boardID := parts[1]

		log.Printf("[Alert] Received: %s", msg.Topic())

		// 1. Auto-expire any stale active falls older than TTL
		if err := a.FallEventRepo.AutoExpireStale(context.Background(), fallEventTTL); err != nil {
			log.Printf("Failed to auto-expire stale fall events: %v", err)
		}

		// 2. Check for existing active fall (won't be stale anymore)
		existing, err := a.FallEventRepo.GetActive(context.Background(), boardID)
		if err == nil && existing != nil {
			// Recent active fall already exists, skip
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
		} else {
			log.Printf("Subscribers for board %s: %v", boardID, chatIDs)
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
	bot, err := NewBot(subscriptionRepo, botToken, tcpServer,client)
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