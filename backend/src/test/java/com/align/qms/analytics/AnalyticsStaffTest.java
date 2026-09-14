package com.align.qms.analytics;

import com.align.qms.analytics.dto.StaffAnalyticsResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class AnalyticsStaffTest extends BaseAnalyticsIntegrationTest {

    @Test
    void staff_correctGroupingsAndMetrics() {
        setAuth(orgId1, "ORG_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        List<StaffAnalyticsResponse> staffList = analyticsService.getStaff(null, null, null, start, end);
        assertThat(staffList).hasSizeGreaterThanOrEqualTo(1);

        StaffAnalyticsResponse staff = staffList.stream().filter(s -> s.staffId().equals(staff1Org1)).findFirst().get();
        
        assertThat(staff.tokensCompleted()).isEqualTo(3L);
        assertThat(staff.avgWaitTimeSeconds()).isNotNull();
        assertThat(staff.avgServiceTimeSeconds()).isNotNull();
    }
}
