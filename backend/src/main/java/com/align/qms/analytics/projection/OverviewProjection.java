package com.align.qms.analytics.projection;

public interface OverviewProjection {
    Long getTotalTokensIssued();
    Long getTokensCompleted();
    Long getTokensNoShow();
    Long getTokensCancelled();
    Long getTokensExpired();
    Long getTokensInProgress();
    Double getAvgWaitTimeSeconds();
    Long getAvgWaitTimeSampleSize();
    Double getAvgServiceTimeSeconds();
    Long getAvgServiceTimeSampleSize();
    Double getAvgJourneyTimeSeconds();
    Long getAvgJourneyTimeSampleSize();
    Double getNoShowRate();
    Double getCancellationRate();
    Integer getPeakHour();
    Long getPeakHourTokenCount();
}
