package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsOverviewResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class AnalyticsNullHandlingTest extends BaseAnalyticsIntegrationTest {

    @Test
    void zeroDenominators_returnNullNotFabricatedZero() {
        setAuth(orgId1, "ORG_ADMIN");
        // Look at a date range with NO tokens
        Instant start = baseTime.plus(400, ChronoUnit.DAYS);
        Instant end = baseTime.plus(400, ChronoUnit.DAYS).plus(1, ChronoUnit.DAYS);

        AnalyticsOverviewResponse res = analyticsService.getOverview(null, null, start, end);
        
        assertThat(res.totalTokensIssued()).isEqualTo(0L);
        assertThat(res.tokensCompleted()).isEqualTo(0L);
        assertThat(res.avgWaitTimeSeconds()).isNull();
        assertThat(res.avgWaitTimeSampleSize()).isEqualTo(0L);
        assertThat(res.avgServiceTimeSeconds()).isNull();
        assertThat(res.avgServiceTimeSampleSize()).isEqualTo(0L);
        assertThat(res.noShowRate()).isNull();
        assertThat(res.cancellationRate()).isNull();
    }

    @Test
    void nullServedAt_excludedFromServiceTimeAverage() {
        setAuth(orgId1, "ORG_ADMIN");
        
        // Let's create an org with ONLY a token that has completed_at but null served_at
        UUID orgId3 = UUID.randomUUID();
        UUID locId3 = UUID.randomUUID();
        UUID svcId3 = UUID.randomUUID();
        UUID queueId3 = UUID.randomUUID();
        
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", orgId3, "ORG3", "Org 3");
        jdbcTemplate.update("INSERT INTO locations (id, org_id, name, created_at, updated_at) VALUES (?, ?, ?, now(), now())", locId3, orgId3, "Loc 3");
        jdbcTemplate.update("INSERT INTO services (id, location_id, org_id, name, is_fast_track, created_at, updated_at) VALUES (?, ?, ?, ?, false, now(), now())", svcId3, locId3, orgId3, "Service 3");
        jdbcTemplate.update("INSERT INTO queues (id, location_id, org_id, service_id, name, token_prefix, max_capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'T', 10, now(), now())", queueId3, locId3, orgId3, svcId3, "Queue 3");

        jdbcTemplate.update("INSERT INTO tokens (id, org_id, location_id, queue_id, service_id, token_number, state, joined_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'T01', 'COMPLETED', ?, ?, now(), now())",
                UUID.randomUUID(), orgId3, locId3, queueId3, svcId3, java.sql.Timestamp.from(baseTime), java.sql.Timestamp.from(baseTime.plus(15, ChronoUnit.MINUTES)));

        setAuth(orgId3, "ORG_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.DAYS);
        Instant end = baseTime.plus(1, ChronoUnit.DAYS);

        AnalyticsOverviewResponse res = analyticsService.getOverview(null, null, start, end);
        
        assertThat(res.tokensCompleted()).isEqualTo(1L);
        assertThat(res.avgServiceTimeSeconds()).isNull(); // because served_at was null
        assertThat(res.avgServiceTimeSampleSize()).isEqualTo(0L);
    }
}
