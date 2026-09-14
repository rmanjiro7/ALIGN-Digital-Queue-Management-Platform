package com.align.qms.analytics.projection;

import java.util.UUID;

public interface CounterMetricsProjection {
    UUID getCounterId();
    Integer getCounterNumber();
    String getCounterName();
    String getCurrentAvailability();
    Long getTokensCompleted();
    Double getAvgServiceTimeSeconds();
}
