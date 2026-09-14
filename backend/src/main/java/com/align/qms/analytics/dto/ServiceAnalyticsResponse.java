package com.align.qms.analytics.dto;

import java.util.UUID;

public record ServiceAnalyticsResponse(
    UUID serviceId,
    String serviceName,
    Long totalTokens,
    Long completed,
    Long noShow,
    Long cancelled,
    Long expired,
    Long currentWaiting,
    Double avgWaitTimeSeconds,
    Double avgServiceTimeSeconds,
    Double noShowRate,
    Double cancellationRate
) {}
