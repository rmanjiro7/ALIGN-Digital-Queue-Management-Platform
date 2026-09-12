package com.align.qms.queue.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Request body for PUT /api/v1/queues/{queueId}/config.
 * All fields are optional — only non-null values are applied.
 */
public class UpdateQueueConfigRequest {

    @Min(value = 1, message = "Max capacity must be at least 1")
    private Integer maxCapacity;

    private Boolean autoPauseAtCapacity;

    @Size(max = 5, message = "Token prefix must not exceed 5 characters")
    private String tokenPrefix;

    // ── Getters / Setters ────────────────────────────────────────────────────

    public Integer getMaxCapacity()           { return maxCapacity; }
    public Boolean getAutoPauseAtCapacity()   { return autoPauseAtCapacity; }
    public String  getTokenPrefix()           { return tokenPrefix; }

    public void setMaxCapacity(Integer maxCapacity)            { this.maxCapacity = maxCapacity; }
    public void setAutoPauseAtCapacity(Boolean autoPause)      { this.autoPauseAtCapacity = autoPause; }
    public void setTokenPrefix(String tokenPrefix)             { this.tokenPrefix = tokenPrefix; }
}
