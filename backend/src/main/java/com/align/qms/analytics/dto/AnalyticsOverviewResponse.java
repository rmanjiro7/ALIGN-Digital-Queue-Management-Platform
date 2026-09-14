package com.align.qms.analytics.dto;

public record AnalyticsOverviewResponse(
    Long totalTokensIssued,
    Long tokensCompleted,
    Long tokensNoShow,
    Long tokensCancelled,
    Long tokensExpired,
    Long tokensInProgress,
    Double avgWaitTimeSeconds,
    Long avgWaitTimeSampleSize,
    Double avgServiceTimeSeconds,
    Long avgServiceTimeSampleSize,
    Double avgJourneyTimeSeconds,
    Long avgJourneyTimeSampleSize,
    Double noShowRate,
    Double cancellationRate,
    Integer peakHour,
    Long peakHourTokenCount
) {}
