package com.align.qms.location.dto;

import com.align.qms.location.LocationStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateLocationStatusRequest {

    @NotNull(message = "status is required")
    private LocationStatus status;

    public LocationStatus getStatus() { return status; }
    public void setStatus(LocationStatus status) { this.status = status; }
}
