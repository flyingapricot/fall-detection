package repository

import (
	"context"
	"fall-detection/internal/database"
	"time"
)

type FallEvent struct {
    ID         int64
    BoardID    string
    DetectedAt time.Time
    ResolvedAt *time.Time  
    ResolvedBy *int64
    Status     string
}


type FallEventRepo struct {
	db *database.DB
}

func NewFallEventRepo(db *database.DB) *FallEventRepo {
	return &FallEventRepo{db: db}
}

func (r* FallEventRepo) Create(ctx context.Context, boardID string) (int64, error) {
	query := `
		INSERT INTO fall_events (board_id, detected_at)
		VALUES ($1, $2)
		RETURNING id
	`
	var id int64
	err := r.db.Pool.QueryRow(ctx, query, boardID, time.Now()).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r* FallEventRepo) Resolve(ctx context.Context, id int64, resolvedBy int64) error {
	query := `
		UPDATE fall_events SET resolved_at = $1, resolved_by = $2, status = 'resolved' WHERE id = $3
	`
	_, err := r.db.Pool.Exec(ctx, query, time.Now(), resolvedBy, id)
	if err != nil {
		return err
	}
	return nil
}

func (r *FallEventRepo) AutoExpireStale(ctx context.Context, ttl time.Duration) error {
	query := `
		UPDATE fall_events
		SET status = 'expired', resolved_at = $1
		WHERE status = 'active' AND detected_at < $2
	`
	_, err := r.db.Pool.Exec(ctx, query, time.Now(), time.Now().Add(-ttl))
	return err
}

func (r *FallEventRepo) GetByBoard(ctx context.Context, boardID string, limit int) ([]FallEvent, error) {
	query := `
		SELECT id, board_id, detected_at, resolved_at, status
		FROM fall_events
		WHERE board_id = $1
		ORDER BY detected_at DESC
		LIMIT $2
	`
	rows, err := r.db.Pool.Query(ctx, query, boardID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []FallEvent
	for rows.Next() {
		var e FallEvent
		if err := rows.Scan(&e.ID, &e.BoardID, &e.DetectedAt, &e.ResolvedAt, &e.Status); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func (r* FallEventRepo) GetActive(ctx context.Context, boardID string) (*FallEvent, error) {
	query := `
		SELECT id, board_id, detected_at, status 
		FROM fall_events 
		WHERE board_id = $1 AND status = 'active'
		LIMIT 1
	`

	var event FallEvent
	err := r.db.Pool.QueryRow(ctx, query, boardID).Scan(&event.ID, &event.BoardID, &event.DetectedAt, &event.Status)
	if err != nil {
		return nil, err
	}
	return &event, nil
}