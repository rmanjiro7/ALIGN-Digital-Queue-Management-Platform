package com.align.qms.notification;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "announcement_templates")
public class AnnouncementTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(name = "service_id")
    private UUID serviceId;

    @Column(name = "language_code", nullable = false, length = 10)
    private String languageCode;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "template_text", nullable = false, columnDefinition = "TEXT")
    private String templateText;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

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
    public UUID getServiceId() { return serviceId; }
    public void setServiceId(UUID serviceId) { this.serviceId = serviceId; }
    public String getLanguageCode() { return languageCode; }
    public void setLanguageCode(String languageCode) { this.languageCode = languageCode; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getTemplateText() { return templateText; }
    public void setTemplateText(String templateText) { this.templateText = templateText; }
    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
