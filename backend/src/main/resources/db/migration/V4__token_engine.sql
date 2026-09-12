-- =============================================================================
-- V4__token_engine.sql
-- ALIGN QMS — Phase 3 Token Engine Migration
-- =============================================================================

-- =============================================================================
-- 1. tokens
-- =============================================================================
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    token_number VARCHAR(20) NOT NULL,
    state VARCHAR(20) NOT NULL,
    counter_id UUID REFERENCES counters(id) ON DELETE SET NULL,
    called_by_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    step_away_expires_at TIMESTAMP WITH TIME ZONE,
    idempotency_key VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_token_number_queue UNIQUE(queue_id, token_number),
    CONSTRAINT uq_idempotency_key UNIQUE(idempotency_key),
    CONSTRAINT chk_token_state CHECK (state IN (
        'WAITING', 'AWAY', 'CALLED', 'IN_SERVICE', 
        'COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'
    ))
);

-- Performance indexes
CREATE INDEX idx_tokens_queue_state ON tokens(queue_id, state) 
    WHERE state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE');

CREATE INDEX idx_tokens_location_state ON tokens(location_id, state);

CREATE INDEX idx_tokens_customer_phone ON tokens(customer_phone) 
    WHERE customer_phone IS NOT NULL;

CREATE INDEX idx_tokens_step_away_expiry ON tokens(step_away_expires_at) 
    WHERE state = 'AWAY' AND step_away_expires_at IS NOT NULL;

CREATE INDEX idx_tokens_idempotency ON tokens(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;


-- =============================================================================
-- 2. token_events
-- =============================================================================
CREATE TABLE token_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    from_state VARCHAR(20),
    to_state VARCHAR(20),
    counter_id UUID REFERENCES counters(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_token_events_token ON token_events(token_id, created_at DESC);
CREATE INDEX idx_token_events_type ON token_events(event_type);
CREATE INDEX idx_token_events_created ON token_events(created_at DESC);

COMMENT ON TABLE token_events IS 'Token lifecycle event history for analytics and ML training';
COMMENT ON COLUMN token_events.metadata IS 'Extensible JSONB field for event-specific data';

-- =============================================================================
-- 3. Update schema_info
-- =============================================================================
INSERT INTO schema_info (key, value) VALUES
    ('phase', '3 — Token Engine')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();

INSERT INTO schema_info (key, value) VALUES
    ('token_engine_migration', 'V4__token_engine.sql — tokens, token_events')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();
