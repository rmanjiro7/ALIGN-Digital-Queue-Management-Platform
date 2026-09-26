package com.align.qms.analytics.dto;

import java.util.UUID;

public record ServiceAnalyticsResponse(
    UUID serviceId,
    String serviceName,
    Long operationalTokenVolume,
    Long completedTokens,
    Long noShows,
    Long cancellations,
    Long transfers,
    Double completionRate,
    Double noShowRate,
    Double cancellationRate,
    Integer averageServiceDurationSeconds
) {}
