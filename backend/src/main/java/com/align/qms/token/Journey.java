package com.align.qms.token;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "journeys")
public class Journey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "location_id", nullable = false)
    private UUID locationId;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE"; // ACTIVE, COMPLETED, CANCELLED

    @Column(name = "sms_consent", nullable = false)
    private Boolean smsConsent = false;

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
    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }
    public UUID getLocationId() { return locationId; }
    public void setLocationId(UUID locationId) { this.locationId = locationId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getSmsConsent() { return smsConsent; }
    public void setSmsConsent(Boolean smsConsent) { this.smsConsent = smsConsent; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
