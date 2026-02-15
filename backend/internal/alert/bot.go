package alert

import (
	"context"
	"fall-detection/internal/repository"
	"log"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

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

		switch command {
			case "subscribe":
				user := update.Message.From
				err := repo.CreateSubscription(context.Background(), chatID, args, user.FirstName, user.UserName)
				if err != nil {
					b.api.Send(tgbotapi.NewMessage(chatID, "Failed to subscribe"))
				} else {
					b.api.Send(tgbotapi.NewMessage(chatID, "Subscribed to "+args))
				}
			case "unsubscribe":
				err := repo.Unsubscribe(context.Background(), chatID, args)
				if err != nil {
					b.api.Send(tgbotapi.NewMessage(chatID, "Failed to unsubscribe"))
				} else {
					b.api.Send(tgbotapi.NewMessage(chatID, "Unsubscribed from "+args))
				}
			default:
				b.api.Send(tgbotapi.NewMessage(chatID, "Invalid command"))
		}

	}
}