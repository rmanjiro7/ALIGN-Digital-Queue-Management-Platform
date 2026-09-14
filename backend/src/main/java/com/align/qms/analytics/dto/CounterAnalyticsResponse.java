package com.align.qms.analytics.dto;

import java.util.UUID;

public record CounterAnalyticsResponse(
    UUID counterId,
    Integer counterNumber,
    String counterName,
    String currentAvailability,
    Long tokensCompleted,
    Double avgServiceTimeSeconds
) {}
