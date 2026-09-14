package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsOverviewResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class AnalyticsDateFilterTest extends BaseAnalyticsIntegrationTest {

    @Test
    void outsideRange_excluded() {
        setAuth(orgId1, "ORG_ADMIN");
        
        // Filter exactly around baseTime to only include the first hour
        Instant start = baseTime;
        Instant end = baseTime.plus(1, ChronoUnit.HOURS); // token 1 is at 0, token 2 is at 1 hour (so excluded as end is exclusive)

        AnalyticsOverviewResponse res = analyticsService.getOverview(null, null, start, end);
        
        assertThat(res.totalTokensIssued()).isEqualTo(1L);
        assertThat(res.tokensCompleted()).isEqualTo(1L);
        assertThat(res.avgWaitTimeSampleSize()).isEqualTo(1L);
    }

    @Test
    void boundaryInclusivity() {
        setAuth(orgId1, "ORG_ADMIN");
        
        // Token 2 joined exactly at baseTime + 1 hour
        // Start = baseTime + 1 hour -> should include
        Instant start = baseTime.plus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(2, ChronoUnit.HOURS); // Exclusive, token 3 is at +2 hours

        AnalyticsOverviewResponse res = analyticsService.getOverview(null, null, start, end);
        
        assertThat(res.totalTokensIssued()).isEqualTo(1L); // Just token 2
        assertThat(res.tokensCompleted()).isEqualTo(1L);
    }

    @Test
    void maxDateRangeAccepted() {
        setAuth(orgId1, "ORG_ADMIN");
        Instant start = Instant.now();
        Instant end = start.plus(365, ChronoUnit.DAYS);
        analyticsService.getOverview(null, null, start, end); // Should not throw
    }

    @Test
    void dateRangeExceeded_throwsException() {
        setAuth(orgId1, "ORG_ADMIN");
        Instant start = Instant.now();
        Instant end = start.plus(365, ChronoUnit.DAYS).plusSeconds(1);
        assertThrows(IllegalArgumentException.class, () -> analyticsService.getOverview(null, null, start, end));
    }
    
    @Test
    void invertedRange_throwsException() {
        setAuth(orgId1, "ORG_ADMIN");
        assertThrows(IllegalArgumentException.class, () -> analyticsService.getOverview(null, null, baseTime.plusSeconds(1), baseTime));
    }
}
