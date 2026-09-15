package com.align.qms.counter.dto;

import com.align.qms.counter.CounterStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateCounterStatusRequest {

    @NotNull(message = "status is required")
    private CounterStatus status;

    public CounterStatus getStatus() { return status; }
    public void setStatus(CounterStatus status) { this.status = status; }
}
