-- =============================================================================
-- V5__staff_operations.sql
-- ALIGN QMS — Phase 4 Staff Operations Migration
-- =============================================================================

-- 1. Add foreign key from counters.current_serving_token_id to tokens.id
-- This was explicitly deferred to Phase 4 for referential integrity.
ALTER TABLE counters 
    ADD CONSTRAINT fk_counters_token 
    FOREIGN KEY (current_serving_token_id) 
    REFERENCES tokens(id) 
    ON DELETE SET NULL;

-- 2. Optimize index for CALL NEXT location lookup and SKIP LOCKED
-- Efficiently fetches the next token at a location across all its queues
CREATE INDEX idx_tokens_location_state_joined 
    ON tokens(location_id, state, joined_at ASC)
    WHERE state = 'WAITING';

-- 3. Update schema_info
INSERT INTO schema_info (key, value) VALUES
    ('phase', '4 — Staff Operations')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();

INSERT INTO schema_info (key, value) VALUES
    ('staff_operations_migration', 'V5__staff_operations.sql — foreign keys, optimized index')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();
