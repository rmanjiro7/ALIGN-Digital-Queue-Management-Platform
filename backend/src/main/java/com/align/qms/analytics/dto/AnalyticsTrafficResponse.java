package com.align.qms.analytics.dto;

import java.util.List;

public record AnalyticsTrafficResponse(
    List<HourlyBucket> hourlyBuckets,
    List<DailyBucket> dailyBuckets
) {}
