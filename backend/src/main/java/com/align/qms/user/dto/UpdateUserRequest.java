package com.align.qms.user.dto;

import java.util.UUID;
import jakarta.validation.constraints.NotBlank;

public class UpdateUserRequest {

    @NotBlank
    private String name;
    private UUID locationId;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public UUID getLocationId() { return locationId; }
    public void setLocationId(UUID locationId) { this.locationId = locationId; }
}
