package com.align.qms.service.dto;

import jakarta.validation.constraints.Size;

public class UpdateServiceRequest {

    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @Size(max = 255, message = "Icon must not exceed 255 characters")
    private String icon;

    @com.fasterxml.jackson.annotation.JsonProperty("isFastTrack")
    private Boolean isFastTrack;

    @Size(max = 1000, message = "Preparation guidance must not exceed 1000 characters")
    private String preparationGuidance;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public Boolean getIsFastTrack() { return isFastTrack; }
    public void setIsFastTrack(Boolean fastTrack) { isFastTrack = fastTrack; }

    public String getPreparationGuidance() { return preparationGuidance; }
    public void setPreparationGuidance(String preparationGuidance) { this.preparationGuidance = preparationGuidance; }
}
