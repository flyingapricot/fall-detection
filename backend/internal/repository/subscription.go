package repository

import (
	"context"
	"fall-detection/internal/database"
)

type SubscriptionRepo struct {
	db *database.DB
}

func NewSubscriptionRepo(db *database.DB) *SubscriptionRepo {
	return &SubscriptionRepo{db: db}
}

func (r *SubscriptionRepo) CreateSubscription(ctx context.Context, chatID int64, boardID string, firstName string, username string) error {
	query := `
		INSERT INTO subscriptions (chat_id,board_id,first_name,username)	
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (chat_id,board_id) DO NOTHING
	`

	_, err := r.db.Pool.Exec(ctx, query, chatID, boardID, firstName, username)
	return err
}
func (r *SubscriptionRepo) Unsubscribe(ctx context.Context, chatID int64, boardID string) error {
	query := `
		DELETE FROM subscriptions WHERE chat_id = $1 AND board_id = $2
	`

	_, err := r.db.Pool.Exec(ctx, query, chatID, boardID)
	return err
}
func (r *SubscriptionRepo) GetSubscribers(ctx context.Context, boardID string) ([]int64, []string, []string, error) {
	query := `
		SELECT chat_id, first_name, username FROM subscriptions WHERE board_id = $1
	`

	rows, err := r.db.Pool.Query(ctx, query, boardID)
    if err != nil {
        return nil, nil, nil, err
    }
    defer rows.Close()
    
    var chatIDs []int64
    var firstNames []string
    var usernames []string
    for rows.Next() {
        var chatID int64
        var firstName string
        var username string
        if err := rows.Scan(&chatID, &firstName, &username); err != nil {
            return nil, nil, nil, err
        }
        chatIDs = append(chatIDs, chatID)
		firstNames = append(firstNames, firstName)   
		usernames = append(usernames, username)      
    }
    
    return chatIDs, firstNames, usernames, rows.Err()

}