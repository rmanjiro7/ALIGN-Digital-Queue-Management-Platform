package com.align.qms.analytics.dto;

import java.util.UUID;

public record CounterAnalyticsResponse(
    UUID counterId,
    String counterName,
    Long operationalTokenVolume,
    Long completedTokens,
    Long noShows,
    Long cancellations,
    Long transfers,
    Integer averageServiceDurationSeconds
) {}
