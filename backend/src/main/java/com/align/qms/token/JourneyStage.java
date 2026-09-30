package com.align.qms.token;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "journey_stages")
public class JourneyStage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "journey_id", nullable = false)
    private UUID journeyId;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, ACTIVE, COMPLETED, SKIPPED

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getJourneyId() { return journeyId; }
    public void setJourneyId(UUID journeyId) { this.journeyId = journeyId; }
    public UUID getServiceId() { return serviceId; }
    public void setServiceId(UUID serviceId) { this.serviceId = serviceId; }
    public Integer getSequenceOrder() { return sequenceOrder; }
    public void setSequenceOrder(Integer sequenceOrder) { this.sequenceOrder = sequenceOrder; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
