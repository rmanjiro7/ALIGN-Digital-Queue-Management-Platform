package com.align.qms.analytics.dto;

import java.util.UUID;

public record QueueAnalyticsResponse(
    UUID queueId,
    String queueName,
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
