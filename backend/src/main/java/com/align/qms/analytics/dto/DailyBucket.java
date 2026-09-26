package com.align.qms.analytics.dto;

import java.time.Instant;

public record DailyBucket(
    String date,
    Long tokensJoined,
    Long tokensCompleted
) {}
