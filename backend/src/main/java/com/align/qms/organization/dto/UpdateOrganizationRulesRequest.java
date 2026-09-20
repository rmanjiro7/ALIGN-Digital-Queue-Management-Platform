package com.align.qms.organization.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class UpdateOrganizationRulesRequest {

    @NotNull(message = "capacityThresholdPercent is required")
    @Min(value = 1, message = "capacityThresholdPercent must be at least 1")
    @Max(value = 100, message = "capacityThresholdPercent must be at most 100")
    private Short capacityThresholdPercent;

    @NotNull(message = "maxWaitThresholdMins is required")
    @Min(value = 0, message = "maxWaitThresholdMins must be at least 0")
    private Integer maxWaitThresholdMins;

    public Short getCapacityThresholdPercent() {
        return capacityThresholdPercent;
    }

    public void setCapacityThresholdPercent(Short capacityThresholdPercent) {
        this.capacityThresholdPercent = capacityThresholdPercent;
    }

    public Integer getMaxWaitThresholdMins() {
        return maxWaitThresholdMins;
    }

    public void setMaxWaitThresholdMins(Integer maxWaitThresholdMins) {
        this.maxWaitThresholdMins = maxWaitThresholdMins;
    }
}
