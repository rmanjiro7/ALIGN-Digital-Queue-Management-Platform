package com.align.qms.counter.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class CounterAssignmentRequest {

    @NotNull
    private UUID staffUserId;

    public UUID getStaffUserId() {
        return staffUserId;
    }

    public void setStaffUserId(UUID staffUserId) {
        this.staffUserId = staffUserId;
    }
}
