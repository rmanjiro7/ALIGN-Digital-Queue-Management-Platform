package com.align.qms.counter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "counter_service_assignments",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"counter_id", "service_id"})
    }
)
public class CounterServiceAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "counter_id", nullable = false)
    private UUID counterId;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public CounterServiceAssignment() {
    }

    public CounterServiceAssignment(UUID counterId, UUID serviceId) {
        this.counterId = counterId;
        this.serviceId = serviceId;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getCounterId() {
        return counterId;
    }

    public UUID getServiceId() {
        return serviceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
