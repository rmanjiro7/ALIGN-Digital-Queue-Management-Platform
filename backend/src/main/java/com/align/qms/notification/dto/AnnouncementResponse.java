package com.align.qms.notification.dto;

import java.util.UUID;
import java.time.Instant;

public class AnnouncementResponse {
    private UUID id;
    private UUID locationId;
    private String text;
    private String status;
    private Instant createdAt;

    public AnnouncementResponse(UUID id, UUID locationId, String text, String status, Instant createdAt) {
        this.id = id;
        this.locationId = locationId;
        this.text = text;
        this.status = status;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getLocationId() { return locationId; }
    public String getText() { return text; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
