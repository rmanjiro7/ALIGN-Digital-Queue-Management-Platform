package com.align.qms.analytics.projection;

import java.util.UUID;

public interface QueueMetricsProjection {
    UUID getQueueId();
    String getQueueName();
    String getServiceName();
    Long getTotalTokens();
    Long getCompleted();
    Long getNoShow();
    Long getCancelled();
    Long getExpired();
    Long getCurrentWaiting();
    Double getAvgWaitTimeSeconds();
    Double getAvgServiceTimeSeconds();
    Double getNoShowRate();
    Double getCancellationRate();
}
