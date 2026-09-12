package com.align.qms.queue.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for POST /api/v1/queues (ORG_ADMIN).
 * Creates the queue for a specific service.
 */
public class CreateQueueRequest {

    @NotNull(message = "Service ID is required")
    private UUID serviceId;

    @NotBlank(message = "Queue name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @Size(max = 5, message = "Token prefix must not exceed 5 characters")
    private String tokenPrefix;

    @Min(value = 1, message = "Max capacity must be at least 1")
    private Integer maxCapacity;

    // ── Getters / Setters ────────────────────────────────────────────────────

    public UUID    getServiceId()   { return serviceId; }
    public String  getName()        { return name; }
    public String  getTokenPrefix() { return tokenPrefix; }
    public Integer getMaxCapacity() { return maxCapacity; }

    public void setServiceId(UUID serviceId)      { this.serviceId = serviceId; }
    public void setName(String name)              { this.name = name; }
    public void setTokenPrefix(String prefix)     { this.tokenPrefix = prefix; }
    public void setMaxCapacity(Integer capacity)  { this.maxCapacity = capacity; }
}
