-- V11: Phase 6.7.3 Queue Warning State

ALTER TABLE queues
ADD COLUMN capacity_warning_active BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE queues
ADD COLUMN wait_warning_active BOOLEAN NOT NULL DEFAULT false;
