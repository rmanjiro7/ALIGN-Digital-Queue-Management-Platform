package com.align.qms.analytics.projection;

public interface HourlyTrafficProjection {
    Integer getHour();
    Long getTokensJoined();
    Long getTokensCompleted();
}
