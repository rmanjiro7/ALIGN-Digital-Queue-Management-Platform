package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsOverviewResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class AnalyticsTenantIsolationTest extends BaseAnalyticsIntegrationTest {

    @Test
    void orgAdmin_seesOnlyOwnOrg() {
        setAuth(orgId2, "ORG_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        AnalyticsOverviewResponse res = analyticsService.getOverview(null, null, start, end);
        
        // Org 2 only has 1 token
        assertThat(res.totalTokensIssued()).isEqualTo(1L);
    }

    @Test
    void orgAdmin_cannotAccessAnotherOrg() {
        setAuth(orgId1, "ORG_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        // Org1 tries to request Org2 explicitly
        assertThrows(IllegalArgumentException.class, () -> analyticsService.getOverview(orgId2, null, start, end));
    }

    @Test
    void platformAdmin_mustProvideOrgId() {
        setAuth(null, "PLATFORM_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        assertThrows(IllegalArgumentException.class, () -> analyticsService.getOverview(null, null, start, end));
    }

    @Test
    void platformAdmin_canQueryAnyOrg() {
        setAuth(null, "PLATFORM_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        AnalyticsOverviewResponse res1 = analyticsService.getOverview(orgId1, null, start, end);
        assertThat(res1.totalTokensIssued()).isEqualTo(9L);

        AnalyticsOverviewResponse res2 = analyticsService.getOverview(orgId2, null, start, end);
        assertThat(res2.totalTokensIssued()).isEqualTo(1L);
    }
}
