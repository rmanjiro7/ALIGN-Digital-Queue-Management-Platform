CREATE TABLE counter_service_assignments (
    id UUID PRIMARY KEY,
    counter_id UUID NOT NULL REFERENCES counters(id),
    service_id UUID NOT NULL REFERENCES services(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_counter_service UNIQUE (counter_id, service_id)
);

CREATE INDEX idx_counter_service_assignments_counter_id ON counter_service_assignments(counter_id);
CREATE INDEX idx_counter_service_assignments_service_id ON counter_service_assignments(service_id);
