package com.align.qms.counter.dto;

import com.align.qms.counter.CounterAvailability;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for PUT /api/v1/counters/{counterId}/availability.
 */
public class UpdateCounterAvailabilityRequest {

    @NotNull(message = "Availability is required")
    private CounterAvailability availability;

    public CounterAvailability getAvailability() { return availability; }
    public void setAvailability(CounterAvailability availability) { this.availability = availability; }
}
