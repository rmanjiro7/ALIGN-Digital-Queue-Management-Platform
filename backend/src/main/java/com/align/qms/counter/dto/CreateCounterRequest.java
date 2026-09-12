package com.align.qms.counter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for POST /api/v1/counters (ORG_ADMIN).
 */
public class CreateCounterRequest {

    @NotNull(message = "Location ID is required")
    private UUID locationId;

    @Min(value = 1, message = "Counter number must be at least 1")
    @NotNull(message = "Counter number is required")
    private Integer number;

    @Size(max = 100, message = "Counter name must not exceed 100 characters")
    private String name;

    // ── Getters / Setters ────────────────────────────────────────────────────

    public UUID    getLocationId() { return locationId; }
    public Integer getNumber()     { return number; }
    public String  getName()       { return name; }

    public void setLocationId(UUID locationId) { this.locationId = locationId; }
    public void setNumber(Integer number)      { this.number = number; }
    public void setName(String name)           { this.name = name; }
}
