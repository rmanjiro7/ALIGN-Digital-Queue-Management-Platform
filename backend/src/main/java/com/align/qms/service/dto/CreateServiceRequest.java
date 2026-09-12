package com.align.qms.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for POST /api/v1/services (ORG_ADMIN).
 */
public class CreateServiceRequest {

    @NotNull(message = "Location ID is required")
    private UUID locationId;

    @NotBlank(message = "Service name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @Size(max = 50, message = "Icon must not exceed 50 characters")
    private String icon;

    @NotNull(message = "isFastTrack flag is required")
    private Boolean isFastTrack;

    @Size(max = 2000, message = "Preparation guidance must not exceed 2000 characters")
    private String preparationGuidance;

    // ── Getters / Setters ────────────────────────────────────────────────────

    public UUID    getLocationId()          { return locationId; }
    public String  getName()                { return name; }
    public String  getDescription()         { return description; }
    public String  getIcon()                { return icon; }
    public Boolean getIsFastTrack()         { return isFastTrack; }
    public String  getPreparationGuidance() { return preparationGuidance; }

    public void setLocationId(UUID locationId)              { this.locationId = locationId; }
    public void setName(String name)                        { this.name = name; }
    public void setDescription(String description)          { this.description = description; }
    public void setIcon(String icon)                        { this.icon = icon; }
    public void setIsFastTrack(Boolean isFastTrack)         { this.isFastTrack = isFastTrack; }
    public void setPreparationGuidance(String guidance)     { this.preparationGuidance = guidance; }
}
