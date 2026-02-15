package alert

import (
	"context"
	"fall-detection/internal/repository"
	"log"
	"regexp"
	"strings"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

var boardIDPattern = regexp.MustCompile(`^board\d+$`)

type Bot struct {
	api *tgbotapi.BotAPI
	chatIDs []int64
	SubscriptionRepo *repository.SubscriptionRepo
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


func NewBot(subscriptionRepo *repository.SubscriptionRepo, botToken string) (*Bot,error) {
	api, err := tgbotapi.NewBotAPI(botToken)
	if err != nil {
		return nil,err
	}

	return &Bot{
		api: api,
		SubscriptionRepo: subscriptionRepo,
	}, nil
}

func (b *Bot) ListenForCommands(repo *repository.SubscriptionRepo) {
	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60
	updates := b.api.GetUpdatesChan(u)

	for update := range updates {
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
				err := repo.CreateSubscription(context.Background(), chatID, boardID, user.FirstName, user.UserName)
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
				err := repo.Unsubscribe(context.Background(), chatID, boardID)
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