package com.align.qms.analytics.projection;

import java.util.UUID;

public interface StaffMetricsProjection {
    UUID getStaffId();
    String getStaffName();
    Long getTokensCompleted();
    Double getAvgWaitTimeSeconds();
    Double getAvgServiceTimeSeconds();
    Long getTokensNoShow();
}
