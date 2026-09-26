package com.align.qms.analytics.dto;

import java.time.Instant;

public record DailyBucket(
    Instant date,
    Long tokensJoined,
    Long tokensCompleted
) {}
