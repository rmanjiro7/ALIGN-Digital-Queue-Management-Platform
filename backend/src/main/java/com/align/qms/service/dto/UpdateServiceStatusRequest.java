package com.align.qms.service.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Request body for PUT /api/v1/services/{serviceId}/status.
 */
public class UpdateServiceStatusRequest {

    @NotNull(message = "enabled flag is required")
    private Boolean enabled;

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}
