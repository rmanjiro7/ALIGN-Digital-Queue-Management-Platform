CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL,
    location_id UUID NOT NULL,
    token_id UUID,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255),
    payload JSONB,
    status VARCHAR(20) NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    next_attempt_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_org_id ON notifications (org_id);
CREATE INDEX idx_notifications_location_id ON notifications (location_id);
CREATE INDEX idx_notifications_status ON notifications (status);
CREATE INDEX idx_notifications_next_attempt_at ON notifications (next_attempt_at);
CREATE INDEX idx_notifications_token_id ON notifications (token_id);
