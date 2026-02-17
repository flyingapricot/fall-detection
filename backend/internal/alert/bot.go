package alert

import (
	"context"
	"fall-detection/internal/mqtt"
	"fall-detection/internal/repository"
	"fall-detection/internal/tcp"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

var boardIDPattern = regexp.MustCompile(`^board\d+$`)

type Bot struct {
	api              *tgbotapi.BotAPI
	chatIDs          []int64
	SubscriptionRepo *repository.SubscriptionRepo
	TCPServer        *tcp.TCPServer
	AlertClient      pahomqtt.Client
}

func (b *Bot) SendAlert(message string) error {
	var lastErr error

	for _, chatID := range b.chatIDs {
		if err := b.SendMessage(chatID, message); err != nil {
			lastErr = err
			log.Printf("Failed to send to %d: %v", chatID, err)
		}
	}

	return lastErr
}

func (b *Bot) SendMessage(chatID int64, text string) error {
	msg := tgbotapi.NewMessage(chatID, text)
	_, err := b.api.Send(msg)
	return err
}

func NewBot(subscriptionRepo *repository.SubscriptionRepo, botToken string, tcpServer *tcp.TCPServer, alertClient pahomqtt.Client) (*Bot, error) {
	api, err := tgbotapi.NewBotAPI(botToken)
	if err != nil {
		return nil, err
	}

	return &Bot{
		api:              api,
		SubscriptionRepo: subscriptionRepo,
		TCPServer:        tcpServer,
		AlertClient:      alertClient,
	}, nil
}

func (b *Bot) ListenForCommands(subscriptionRepo *repository.SubscriptionRepo, fallEventRepo *repository.FallEventRepo) {
	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60
	updates := b.api.GetUpdatesChan(u)

	for update := range updates {
		if update.CallbackQuery != nil {
			b.handleCallback(update.CallbackQuery, fallEventRepo)
			continue
		}
		if update.Message == nil || !update.Message.IsCommand() {
			continue
		}
		chatID := update.Message.Chat.ID
		command := update.Message.Command()
		args := update.Message.CommandArguments()

		boardID := strings.TrimSpace(args)

		switch command {
		case "subscribe":
			if !boardIDPattern.MatchString(boardID) {
				b.api.Send(tgbotapi.NewMessage(chatID, "Invalid format. Usage: /subscribe board#number\nExample: /subscribe board1"))
				continue
			}
			user := update.Message.From
			err := subscriptionRepo.CreateSubscription(context.Background(), chatID, boardID, user.FirstName, user.UserName)
			if err != nil {
				b.api.Send(tgbotapi.NewMessage(chatID, "Failed to subscribe"))
			} else {
				b.api.Send(tgbotapi.NewMessage(chatID, "Subscribed to "+boardID))
			}
		case "unsubscribe":
			if !boardIDPattern.MatchString(boardID) {
				b.api.Send(tgbotapi.NewMessage(chatID, "Invalid format. Usage: /unsubscribe board#number\nExample: /unsubscribe board1"))
				continue
			}
			err := subscriptionRepo.Unsubscribe(context.Background(), chatID, boardID)
			if err != nil {
				b.api.Send(tgbotapi.NewMessage(chatID, "Failed to unsubscribe"))
			} else {
				b.api.Send(tgbotapi.NewMessage(chatID, "Unsubscribed from "+boardID))
			}
		default:
			b.api.Send(tgbotapi.NewMessage(chatID, "Unknown command. Available commands:\n/subscribe board#number\n/unsubscribe board#number"))
		}

	}
}

func (b *Bot) SendFallAlert(chatID int64, boardID string, eventID int64) {
	msg := tgbotapi.NewMessage(chatID, "🚨 FALL DETECTED - Board "+boardID)
	msg.ReplyMarkup = tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✅ Mark Resolved", fmt.Sprintf("resolve:%d:%s", eventID, boardID)),
		),
	)
	b.api.Send(msg)
}

func (b *Bot) handleCallback(callback *tgbotapi.CallbackQuery, repo *repository.FallEventRepo) {
	data := callback.Data // "resolve:123:board1"
	parts := strings.Split(data, ":")

	if len(parts) == 3 && parts[0] == "resolve" {
		eventID, _ := strconv.ParseInt(parts[1], 10, 64)
		boardID := parts[2]

		// Resolve the event
		repo.Resolve(context.Background(), eventID, callback.From.ID)

		// Answer the callback (removes loading state)
		b.api.Request(tgbotapi.NewCallback(callback.ID, "Resolved!"))

		// Update the message
		b.api.Send(tgbotapi.NewMessage(callback.Message.Chat.ID,
			fmt.Sprintf("✅ Resolved by @%s", callback.From.UserName)))

		// After resolving, send a message to the alerts topic
		mqtt.Publish(b.AlertClient, "fall-detection/"+boardID+"/alerts", "RESOLVED")
	}
}
