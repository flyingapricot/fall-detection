CREATE TABLE fall_events (
    id SERIAL PRIMARY KEY,
    board_id VARCHAR(255) NOT NULL,
    detected_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    resolved_by BIGINT,  -- chat_id of resolver
    status VARCHAR(50) DEFAULT 'active'  -- active, resolved, expired
);