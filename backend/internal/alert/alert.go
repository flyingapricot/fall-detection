package alert

import (
	"context"
	"fall-detection/internal/mqtt"
	"fall-detection/internal/repository"
	"fall-detection/internal/tcp"
	"fmt"
	"log"
	"strings"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)

// fallEventTTL is the safety-net: if a fall event is not cleared by NFC tap
// within this duration, it is marked expired and subscribers are warned.
const fallEventTTL = 5 * time.Minute

type Alert struct {
	Client           pahomqtt.Client
	Bot              *Bot
	SubscriptionRepo *repository.SubscriptionRepo
	FallEventRepo    *repository.FallEventRepo
}

func (a *Alert) Start() {
	log.Printf("[Alert] Client connected: %v", a.Client.IsConnected())
	if !a.Client.IsConnected() {
		log.Println("[Alert] ERROR: MQTT client not connected!")
		return
	}

	// Background safety-net: expire events that have been active for more than
	// fallEventTTL (board lost power / NFC tap never happened). Runs every 30s.
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			expiredBoards, err := a.FallEventRepo.AutoExpireStale(context.Background(), fallEventTTL)
			if err != nil {
				log.Printf("[Alert] Failed to auto-expire stale events: %v", err)
				continue
			}
			for _, boardID := range expiredBoards {
				log.Printf("[Alert] Safety-net expired event for %s", boardID)

				// Warn all Telegram subscribers
				chatIDs, _, _, err := a.SubscriptionRepo.GetSubscribers(context.Background(), boardID)
				if err == nil {
					warnMsg := fmt.Sprintf(
						"⚠️ Fall alert on %s has not been cleared after 5 minutes.\n\nThe board may have lost power or be malfunctioning. Please check the board physically.",
						boardID,
					)
					for _, chatID := range chatIDs {
						a.Bot.SendMessage(chatID, warnMsg)
					}
				}

				// Notify frontend
				mqtt.Publish(a.Client, "fall-detection/"+boardID+"/alerts", "BOARD_EXPIRED")
			}
		}
	}()

	log.Println("[Alert] Subscribing to fall-detection/+/alerts...")
	token := a.Client.Subscribe("fall-detection/+/alerts", 1, func(_ pahomqtt.Client, msg pahomqtt.Message) {
		payload := strings.TrimSpace(string(msg.Payload()))
		parts := strings.Split(msg.Topic(), "/")
		if len(parts) < 3 {
			return
		}
		boardID := parts[1]

		switch payload {

		case "BOARD_RESET":
			// NFC tap detected by the TCP server: resolve the active event.
			log.Printf("[Alert] BOARD_RESET received for %s", boardID)
			resolved, err := a.FallEventRepo.ResolveActiveForBoard(context.Background(), boardID)
			if err != nil {
				log.Printf("[Alert] Failed to resolve fall event for %s: %v", boardID, err)
				return
			}
			if !resolved {
				// Already expired or no active event — nothing to do.
				return
			}

			// Notify Telegram subscribers that the board was reset via NFC.
			chatIDs, _, _, err := a.SubscriptionRepo.GetSubscribers(context.Background(), boardID)
			if err == nil {
				resolvedMsg := fmt.Sprintf(
					"✅ Fall alert on %s has been cleared — NFC device was tapped on the board.",
					boardID,
				)
				for _, chatID := range chatIDs {
					a.Bot.SendMessage(chatID, resolvedMsg)
				}
			}

			// Notify the frontend dashboard.
			mqtt.Publish(a.Client, "fall-detection/"+boardID+"/alerts", "NFC_RESOLVED")

		case "NFC_RESOLVED", "BOARD_EXPIRED":
			// Our own messages published above — ignore to avoid loopback processing.
			return

		default:
			// Assume it's a CSV fall-alert line from the TCP server (fallStatus 0→1).
			// Dedup: if there's already an active event for this board, skip.
			active, err := a.FallEventRepo.GetActive(context.Background(), boardID)
			if err == nil && active != nil {
				log.Printf("[Alert] Duplicate alert for %s — active event #%d exists, skipping", boardID, active.ID)
				return
			}

			eventID, err := a.FallEventRepo.Create(context.Background(), boardID)
			if err != nil {
				log.Printf("[Alert] Failed to create fall event for %s: %v", boardID, err)
				return
			}
			log.Printf("[Alert] Created fall event #%d for %s", eventID, boardID)

			chatIDs, _, _, err := a.SubscriptionRepo.GetSubscribers(context.Background(), boardID)
			if err != nil {
				log.Printf("[Alert] Failed to get subscribers for %s: %v", boardID, err)
				return
			}
			for _, chatID := range chatIDs {
				a.Bot.SendFallAlert(chatID, boardID, eventID)
			}
		}
	})

	token.Wait()
	if token.Error() != nil {
		log.Printf("[Alert] Subscribe FAILED: %v", token.Error())
	} else {
		log.Println("[Alert] Subscribe SUCCESS")
	}
}

func NewAlert(client pahomqtt.Client, subscriptionRepo *repository.SubscriptionRepo, fallEventRepo *repository.FallEventRepo, botToken string, tcpServer *tcp.TCPServer) (*Alert, error) {
	bot, err := NewBot(subscriptionRepo, botToken, tcpServer, client)
	if err != nil {
		return nil, err
	}
	return &Alert{
		Client:           client,
		Bot:              bot,
		SubscriptionRepo: subscriptionRepo,
		FallEventRepo:    fallEventRepo,
	}, nil
}
