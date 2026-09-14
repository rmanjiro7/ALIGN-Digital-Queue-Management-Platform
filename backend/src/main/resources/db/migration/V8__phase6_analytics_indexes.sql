-- =============================================================================
-- V8__phase6_analytics_indexes.sql
-- ALIGN QMS — Phase 6 Analytics Indexes
-- =============================================================================

-- Supports org-wide demand, traffic, and cohort metrics based on when tokens joined
CREATE INDEX idx_tokens_org_joined ON tokens(org_id, joined_at);

-- Supports org-wide real-time state counts (e.g., current queue depth across org)
CREATE INDEX idx_tokens_org_state ON tokens(org_id, state);

-- Supports queue-level throughput and performance metrics over time
CREATE INDEX idx_tokens_org_queue_completed ON tokens(org_id, queue_id, completed_at);

-- Supports staff throughput and performance metrics over time
CREATE INDEX idx_tokens_org_staff_completed ON tokens(org_id, called_by_staff_id, completed_at);

-- Supports counter throughput metrics over time
CREATE INDEX idx_tokens_org_counter_completed ON tokens(org_id, counter_id, completed_at);
