package alert

import (
	"context"
	"fall-detection/internal/repository"
	"log"
	"strings"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

type Alert struct {
	Client pahomqtt.Client
	Bot *Bot
	SubscriptionRepo *repository.SubscriptionRepo
}


func (a *Alert) Start() {
    a.Client.Subscribe("fall-detection/+/alerts", 1,func(client pahomqtt.Client, msg pahomqtt.Message) {
        data := string(msg.Payload())
		topic := msg.Topic()
		parts := strings.Split(topic, "/")
		boardID := parts[1]

		chatIDs, _, _, err := a.SubscriptionRepo.GetSubscribers(context.Background(), boardID)
		if err != nil {
			log.Printf("Failed to get subscribers for board %s: %v", boardID, err)
			return
		}

        // Send Telegram notification
		for _, chatID := range chatIDs {
			a.Bot.SendMessage(chatID, "🚨 Fall Detected!\n" + data)
		}
    })
}

func NewAlert(client pahomqtt.Client, subscriptionRepo *repository.SubscriptionRepo, botToken string) (*Alert,error) {
	bot, err := NewBot(subscriptionRepo, botToken)
	if err != nil {
		return nil, err
	}
	return &Alert{
		Client: client,	
		Bot: bot,
		SubscriptionRepo: subscriptionRepo,
	}, nil
}