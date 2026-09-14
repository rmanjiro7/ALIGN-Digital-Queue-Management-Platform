package com.align.qms.analytics.dto;

public record HourlyBucket(
    Integer hour,
    Long tokensJoined,
    Long tokensCompleted
) {}
