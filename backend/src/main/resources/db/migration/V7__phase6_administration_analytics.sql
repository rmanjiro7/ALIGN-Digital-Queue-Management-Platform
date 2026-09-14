-- V7: Phase 6 Administration & Analytics schema updates

CREATE TABLE admin_audit_events (
    id UUID PRIMARY KEY,
    org_id UUID,
    actor_id UUID,
    actor_role VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_audit_org_created ON admin_audit_events(org_id, created_at);
CREATE INDEX idx_audit_entity ON admin_audit_events(entity_type, entity_id);

CREATE TABLE counter_availability_log (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL,
    location_id UUID NOT NULL,
    counter_id UUID NOT NULL,
    old_availability VARCHAR(50),
    new_availability VARCHAR(50) NOT NULL,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_counter_log_org_loc ON counter_availability_log(org_id, location_id, changed_at);
CREATE INDEX idx_counter_log_counter ON counter_availability_log(counter_id, changed_at);

-- Analytics indexes for querying tokens and events
CREATE INDEX idx_tokens_org_completed ON tokens(org_id, completed_at);

-- Add org_id to token_events to support analytics indexing
ALTER TABLE token_events ADD COLUMN org_id UUID;
UPDATE token_events te SET org_id = t.org_id FROM tokens t WHERE te.token_id = t.id;
ALTER TABLE token_events ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE token_events ADD CONSTRAINT fk_token_events_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_token_events_org_created ON token_events(org_id, created_at);
