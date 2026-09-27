ALTER TABLE locations ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'UTC', ADD COLUMN enforce_schedule BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE location_schedules (
    id UUID PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_location_schedules_location_day ON location_schedules(location_id, day_of_week);
