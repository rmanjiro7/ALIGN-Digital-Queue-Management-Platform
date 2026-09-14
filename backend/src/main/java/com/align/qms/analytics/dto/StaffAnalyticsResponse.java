package com.align.qms.analytics.dto;

import java.util.UUID;

public record StaffAnalyticsResponse(
    UUID staffId,
    String staffName,
    Long tokensCompleted,
    Double avgWaitTimeSeconds,
    Double avgServiceTimeSeconds,
    Long tokensNoShow
) {}
