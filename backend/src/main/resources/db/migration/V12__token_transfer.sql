ALTER TABLE tokens ADD COLUMN transferred_to_token_id UUID NULL;
ALTER TABLE tokens ADD CONSTRAINT fk_tokens_transferred_to FOREIGN KEY (transferred_to_token_id) REFERENCES tokens(id) ON DELETE SET NULL;
ALTER TABLE tokens ADD COLUMN priority_timestamp TIMESTAMP WITH TIME ZONE NULL;

-- Backfill priority_timestamp for existing tokens
UPDATE tokens SET priority_timestamp = joined_at WHERE priority_timestamp IS NULL;

-- Update the check constraint to include TRANSFERRED
ALTER TABLE tokens DROP CONSTRAINT chk_token_state;
ALTER TABLE tokens ADD CONSTRAINT chk_token_state CHECK (state IN (
    'WAITING', 'AWAY', 'CALLED', 'IN_SERVICE',
    'COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED', 'TRANSFERRED'
));
