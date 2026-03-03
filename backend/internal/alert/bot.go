package alert

import (
	"context"
	"fall-detection/internal/repository"
	"fall-detection/internal/tcp"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"

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
		case "start", "help":
			b.api.Send(tgbotapi.NewMessage(chatID, `👋 Welcome to the Fall Detection Monitor!

I'll send you real-time alerts whenever a fall is detected on your boards, and let you acknowledge them directly from Telegram.

To get started:
  /subscribe board1 — receive alerts for board 1

Available commands:
  /subscribe board#    – Subscribe to a board
  /unsubscribe board#  – Unsubscribe from a board
  /myboards            – List your active subscriptions
  /statuses            – Show online/offline status of your boards
  /history board#      – Last 5 fall events for a board
  /help                – Show this message again`))
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

		case "myboards":
			// Lists the active subscriptions of the user
			boardsSubscribedTo, err := b.SubscriptionRepo.GetBoardsSubscribedTo(context.Background(), chatID)
			if err != nil {
				b.api.Send(tgbotapi.NewMessage(chatID, "Failed to retrieve list of subscriptions: "+err.Error()))
			}

			if len(boardsSubscribedTo) == 0 {
				b.api.Send(tgbotapi.NewMessage(chatID, "You are not subscribed to any boards.\n Use /subscribe board#number to get started."))
				continue
			}

			lines := make([]string, len(boardsSubscribedTo))
			for i, id := range boardsSubscribedTo {
				lines[i] = "• " + id
			}
			b.api.Send(tgbotapi.NewMessage(chatID, "Your subscriptions:\n\n"+strings.Join(lines, "\n")))

		case "statuses":
			// Get current status of boards subscribed to
			boardsOnline := b.TCPServer.GetBoards()
			boardsSubscribedTo, err := b.SubscriptionRepo.GetBoardsSubscribedTo(context.Background(), chatID)
			if err != nil {
				b.api.Send(tgbotapi.NewMessage(chatID, "Failed to retrieve list of subscriptions: "+err.Error()))
			}

			if len(boardsSubscribedTo) == 0 {
				b.api.Send(tgbotapi.NewMessage(chatID, "You are not subscribed to any boards.\n Use /subscribe board#number to get started."))
				continue
			}

			// Build a quick lookup set of online board IDs
			onlineSet := make(map[string]bool)
			for _, board := range boardsOnline {
				onlineSet["board"+board.ID] = true
			}

			lines := make([]string, len(boardsSubscribedTo))
			for i, boardID := range boardsSubscribedTo {
				if onlineSet[boardID] {
					lines[i] = "• " + boardID + " — 🟢 Online"
				} else {
					lines[i] = "• " + boardID + " — 🔴 Offline"
				}
			}

			b.api.Send(tgbotapi.NewMessage(chatID, "Your subscriptions:\n\n"+strings.Join(lines, "\n")))

		case "history":
			if !boardIDPattern.MatchString(boardID) {
				b.api.Send(tgbotapi.NewMessage(chatID, "Invalid format. Usage: /history board#\nExample: /history board1"))
				continue
			}
			events, err := fallEventRepo.GetLastFiveEvents(context.Background(), boardID)
			if err != nil {
				b.api.Send(tgbotapi.NewMessage(chatID, "Failed to retrieve history: "+err.Error()))
				continue
			}
			if len(events) == 0 {
				b.api.Send(tgbotapi.NewMessage(chatID, "No fall events recorded for "+boardID+"."))
				continue
			}
			lines := make([]string, len(events))
			for i, e := range events {
				var status string
				switch e.Status {
				case "resolved":
					if e.ResolvedAt != nil {
						elapsed := e.ResolvedAt.Sub(e.DetectedAt).Round(time.Second)
						status = fmt.Sprintf("✅ Acknowledged in %s", elapsed)
					} else {
						status = "✅ Acknowledged"
					}
				case "expired":
					status = "⏱ Timed out"
				default:
					status = "🔴 Active"
				}
				lines[i] = fmt.Sprintf("%d. %s\n   %s",
					len(events)-i,
					e.DetectedAt.Format("02 Jan 15:04:05"),
					status,
				)
			}
			msg := fmt.Sprintf("Last %d fall events for %s:\n\n%s", len(events), boardID, strings.Join(lines, "\n\n"))
			b.api.Send(tgbotapi.NewMessage(chatID, msg))

		default:
			b.api.Send(tgbotapi.NewMessage(chatID, "Unknown command. Available commands:\n/subscribe board#number\n/unsubscribe board#number"))
		}

	}
}

func (b *Bot) SendFallAlert(chatID int64, boardID string, eventID int64) {
	text := fmt.Sprintf(
		"🚨 FALL DETECTED — %s\n\n⚠️ The alert will only clear when an NFC device is tapped on the board.",
		boardID,
	)
	msg := tgbotapi.NewMessage(chatID, text)
	msg.ReplyMarkup = tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("👀 I've seen this", fmt.Sprintf("seen:%d:%s", eventID, boardID)),
		),
	)
	b.api.Send(msg)
}

func (b *Bot) handleCallback(callback *tgbotapi.CallbackQuery, repo *repository.FallEventRepo) {
	data := callback.Data // "seen:123:board1"
	parts := strings.Split(data, ":")

	if len(parts) != 3 || parts[0] != "seen" {
		return
	}

	eventID, _ := strconv.ParseInt(parts[1], 10, 64)
	boardID := parts[2]

	displayName := callback.From.UserName
	if displayName != "" {
		displayName = "@" + displayName
	} else {
		displayName = callback.From.FirstName
	}

	event, err := repo.GetByID(context.Background(), eventID)
	if err != nil {
		b.api.Request(tgbotapi.NewCallback(callback.ID, "Error checking alert status"))
		return
	}

	switch event.Status {
	case "resolved":
		// Already cleared by NFC tap
		b.api.Request(tgbotapi.NewCallback(callback.ID, "Alert already cleared via NFC tap"))

	case "expired":
		// Safety-net expired — no NFC tap happened in time
		b.api.Request(tgbotapi.NewCallback(callback.ID, "Alert expired — please check the board"))

	default:
		// Still active — broadcast that this person has seen it, no DB change
		b.api.Request(tgbotapi.NewCallback(callback.ID, "Marked as seen 👀"))

		seenMsg := fmt.Sprintf(
			"👀 %s has seen the fall alert on %s\n⚠️ Alert will only clear when the board is NFC-tapped.",
			displayName, boardID,
		)
		chatIDs, _, _, err := b.SubscriptionRepo.GetSubscribers(context.Background(), boardID)
		if err == nil {
			for _, chatID := range chatIDs {
				b.api.Send(tgbotapi.NewMessage(chatID, seenMsg))
			}
		}
	}
}
