-- V9: Global Operational Rules Configuration

ALTER TABLE organizations 
ADD COLUMN capacity_threshold_percent SMALLINT NOT NULL DEFAULT 100 
CHECK (capacity_threshold_percent >= 1 AND capacity_threshold_percent <= 100);

ALTER TABLE organizations 
ADD COLUMN max_wait_threshold_mins INTEGER NOT NULL DEFAULT 0 
CHECK (max_wait_threshold_mins >= 0);
