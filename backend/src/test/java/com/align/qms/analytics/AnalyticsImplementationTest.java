package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsSummaryResponse;
import com.align.qms.analytics.dto.QueueAnalyticsResponse;
import com.align.qms.analytics.dto.StaffServiceDurationResponse;
import com.align.qms.analytics.dto.AnalyticsTrafficResponse;
import com.align.qms.analytics.dto.ServiceAnalyticsResponse;
import com.align.qms.analytics.dto.CounterAnalyticsResponse;
import com.align.qms.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class AnalyticsImplementationTest extends BaseAnalyticsIntegrationTest {

    @BeforeEach
    void setTenant() {
        setAuth(orgId1, "ORG_ADMIN");
    }

    @AfterEach
    void clearTenant() {
        clearAuth();
    }

    private void insertEvent(UUID tokenId, UUID orgId, String eventType, Instant created) {
        jdbcTemplate.update("INSERT INTO token_events (id, token_id, org_id, event_type, metadata, created_at) VALUES (?, ?, ?, ?, '{}', ?)",
                UUID.randomUUID(), tokenId, orgId, eventType, java.sql.Timestamp.from(created));
    }

    @Test
    void testSummaryMetricsWithDateBoundaries() {
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        UUID t01 = jdbcTemplate.queryForObject("SELECT id FROM tokens WHERE token_number = 'T01' AND org_id = ?", UUID.class, orgId1);
        UUID t03 = jdbcTemplate.queryForObject("SELECT id FROM tokens WHERE token_number = 'T03' AND org_id = ?", UUID.class, orgId1);
        UUID t04 = jdbcTemplate.queryForObject("SELECT id FROM tokens WHERE token_number = 'T04' AND org_id = ?", UUID.class, orgId1);

        insertEvent(t01, orgId1, "TOKEN_TRANSFERRED", baseTime.plus(1, ChronoUnit.MINUTES));
        insertEvent(t03, orgId1, "TOKEN_NO_SHOW", baseTime.plus(2, ChronoUnit.HOURS).plus(5, ChronoUnit.MINUTES));
        insertEvent(t04, orgId1, "TOKEN_CANCELLED", baseTime.plus(3, ChronoUnit.HOURS));

        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, loc1Org1, null, null, start, end);

        assertNotNull(summary);
        assertEquals(5, summary.getOperationalTokenVolume());
        assertEquals(2, summary.getCompletedTokens());
        assertEquals(1, summary.getNoShows());
        assertEquals(1, summary.getCancellations());
        assertEquals(1, summary.getTransfers());

        assertEquals(2.0 / 5.0, summary.getCompletionRate(), 0.001);
        assertEquals(1.0 / 5.0, summary.getNoShowRate(), 0.001);
        assertEquals(1.0 / 5.0, summary.getCancellationRate(), 0.001);
    }

    @Test
    void testTenantIsolation_OrgAdminCannotAccessAnotherOrg() {
        // Run query as orgId2 (which has loc1Org2)
        setAuth(orgId2, "ORG_ADMIN");

        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        // Attempt to pass orgId1 while authenticated as orgId2
        assertThrows(com.align.qms.exception.UnauthorizedTenantAccessException.class, () -> {
            analyticsService.getSummary(orgId1, loc1Org1, null, null, start, end);
        });
    }

    @Test
    void testTenantIsolation_OrgAdminForeignLocationReturnsNoData() {
        // Authenticated as orgId1
        setAuth(orgId1, "ORG_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        UUID loc1Org2 = jdbcTemplate.queryForObject("SELECT id FROM locations WHERE name = 'Loc 1 Org 2'", UUID.class);

        // orgId1 is authorized for orgId1, but location belongs to orgId2
        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, loc1Org2, null, null, start, end);

        // Since the resources don't intersect, should return 0 safely without leaking data
        assertEquals(0, summary.getOperationalTokenVolume());
    }

    @Test
    void testPlatformAdmin_CanQueryAuthorizedTargetOrg() {
        // Set auth to PLATFORM_ADMIN (null orgId)
        setAuth(null, "PLATFORM_ADMIN");

        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        // Query orgId1's data successfully
        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, loc1Org1, null, null, start, end);

        assertNotNull(summary);
        assertEquals(5, summary.getOperationalTokenVolume()); // T01, T02, T03, T04, T05
    }

    @Test
    void testPlatformAdmin_FiltersWithinOrg() {
        setAuth(null, "PLATFORM_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        // Apply queue filter
        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, loc1Org1, null, queue1Loc1, start, end);
        assertNotNull(summary);
        assertEquals(5, summary.getOperationalTokenVolume());
    }

    @Test
    void testPlatformAdmin_CannotCombineTargetOrgWithForeignResource() {
        setAuth(null, "PLATFORM_ADMIN");
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        UUID loc1Org2 = jdbcTemplate.queryForObject("SELECT id FROM locations WHERE name = 'Loc 1 Org 2'", UUID.class);

        // Query orgId1 but provide loc1Org2
        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, loc1Org2, null, null, start, end);

        // Should yield 0 because the resources do not intersect
        assertEquals(0, summary.getOperationalTokenVolume());
    }

    @Test
    void testZeroDenominatorAndEmptyPeriod() {
        Instant start = baseTime.minus(10, ChronoUnit.DAYS);
        Instant end = baseTime.minus(9, ChronoUnit.DAYS);

        AnalyticsSummaryResponse summary = analyticsService.getSummary(orgId1, loc1Org1, null, null, start, end);

        assertNotNull(summary);
        assertEquals(0, summary.getOperationalTokenVolume());
        assertEquals(0.0, summary.getCompletionRate());
        assertEquals(0.0, summary.getNoShowRate());
        assertEquals(0.0, summary.getCancellationRate());
    }

    @Test
    void testStaffServiceDuration() {
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        List<StaffServiceDurationResponse> durations = analyticsService.getStaffServiceDuration(orgId1, loc1Org1, null, start, end);

        assertEquals(1, durations.size());
        StaffServiceDurationResponse resp = durations.get(0);
        assertEquals(staff1Org1, resp.getStaffId());

        assertEquals(2, resp.getCompletedSegments());
        assertEquals(900.0, resp.getAverageServiceDurationSeconds(), 0.001);
    }

    @Test
    void testQueueAnalytics() {
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        List<QueueAnalyticsResponse> queueResponses = analyticsService.getQueueAnalytics(orgId1, loc1Org1, start, end);

        assertFalse(queueResponses.isEmpty());
        QueueAnalyticsResponse q1 = queueResponses.stream().filter(q -> q.getQueueId().equals(queue1Loc1)).findFirst().orElseThrow();

        assertEquals("Queue 1", q1.getQueueName());
        assertEquals(5, q1.getOperationalTokenVolume());
        assertEquals(2, q1.getCompletedTokens());
    }

    @Test
    void testTrafficAnalytics_Hourly() {
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        AnalyticsTrafficResponse traffic = analyticsService.getTraffic(orgId1, loc1Org1, start, end, "UTC");
        assertNotNull(traffic);
        assertFalse(traffic.hourlyBuckets().isEmpty());
        assertTrue(traffic.dailyBuckets().isEmpty());
    }

    @Test
    void testTrafficAnalytics_Daily() {
        Instant start = baseTime.minus(2, ChronoUnit.DAYS);
        Instant end = baseTime.plus(5, ChronoUnit.DAYS);

        AnalyticsTrafficResponse traffic = analyticsService.getTraffic(orgId1, loc1Org1, start, end, "UTC");
        assertNotNull(traffic);
        assertTrue(traffic.hourlyBuckets().isEmpty());
        assertFalse(traffic.dailyBuckets().isEmpty());
    }

    @Test
    void testServiceAnalytics() {
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        List<ServiceAnalyticsResponse> services = analyticsService.getServiceAnalytics(orgId1, loc1Org1, start, end);
        assertNotNull(services);
        assertFalse(services.isEmpty());
    }

    @Test
    void testCounterAnalytics() {
        Instant start = baseTime.minus(1, ChronoUnit.HOURS);
        Instant end = baseTime.plus(5, ChronoUnit.HOURS);

        List<CounterAnalyticsResponse> counters = analyticsService.getCounterAnalytics(orgId1, loc1Org1, start, end);
        assertNotNull(counters);
    }
    @Test
    void testTrafficAnalytics_SpringForward_DST() {
        Instant t1 = Instant.parse("2023-03-12T06:59:00Z"); // 01:59 EST (Hour 1)
        Instant t2 = Instant.parse("2023-03-12T07:01:00Z"); // 03:01 EDT (Hour 3)

        UUID tk1 = UUID.randomUUID();
        UUID tk2 = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO tokens (id, token_number, org_id, location_id, queue_id, service_id, state, joined_at) VALUES (?, 'DST-1', ?, ?, ?, ?, 'WAITING', ?)", tk1, orgId1, loc1Org1, queue1Loc1, service1Loc1, java.sql.Timestamp.from(t1));
        jdbcTemplate.update("INSERT INTO tokens (id, token_number, org_id, location_id, queue_id, service_id, state, joined_at) VALUES (?, 'DST-2', ?, ?, ?, ?, 'WAITING', ?)", tk2, orgId1, loc1Org1, queue1Loc1, service1Loc1, java.sql.Timestamp.from(t2));

        Instant start = Instant.parse("2023-03-12T05:00:00Z");
        Instant end = Instant.parse("2023-03-12T10:00:00Z");

        AnalyticsTrafficResponse traffic = analyticsService.getTraffic(orgId1, loc1Org1, start, end, "America/New_York");

        List<com.align.qms.analytics.dto.HourlyBucket> hourly = traffic.hourlyBuckets();
        long hour1Tokens = hourly.stream().filter(b -> b.hour() == 1).mapToLong(b -> b.tokensJoined()).sum();
        long hour2Tokens = hourly.stream().filter(b -> b.hour() == 2).mapToLong(b -> b.tokensJoined()).sum();
        long hour3Tokens = hourly.stream().filter(b -> b.hour() == 3).mapToLong(b -> b.tokensJoined()).sum();

        assertEquals(1, hour1Tokens);
        assertEquals(0, hour2Tokens);
        assertEquals(1, hour3Tokens);
    }

    @Test
    void testTrafficAnalytics_FallBack_DST() {
        Instant t1 = Instant.parse("2023-11-05T05:30:00Z");
        Instant t2 = Instant.parse("2023-11-05T06:30:00Z");

        UUID tk1 = UUID.randomUUID();
        UUID tk2 = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO tokens (id, token_number, org_id, location_id, queue_id, service_id, state, joined_at) VALUES (?, 'FBDST-1', ?, ?, ?, ?, 'WAITING', ?)", tk1, orgId1, loc1Org1, queue1Loc1, service1Loc1, java.sql.Timestamp.from(t1));
        jdbcTemplate.update("INSERT INTO tokens (id, token_number, org_id, location_id, queue_id, service_id, state, joined_at) VALUES (?, 'FBDST-2', ?, ?, ?, ?, 'WAITING', ?)", tk2, orgId1, loc1Org1, queue1Loc1, service1Loc1, java.sql.Timestamp.from(t2));

        Instant start = Instant.parse("2023-11-05T04:00:00Z");
        Instant end = Instant.parse("2023-11-05T08:00:00Z");

        AnalyticsTrafficResponse traffic = analyticsService.getTraffic(orgId1, loc1Org1, start, end, "America/New_York");

        List<com.align.qms.analytics.dto.HourlyBucket> hourly = traffic.hourlyBuckets();
        long hour1Tokens = hourly.stream().filter(b -> b.hour() == 1).mapToLong(b -> b.tokensJoined()).sum();

        assertEquals(2, hour1Tokens);
    }

    @Test
    void testTrafficAnalytics_Daily_LocalBoundary_Crossover() {
        Instant t1 = Instant.parse("2023-01-01T20:00:00Z");

        UUID tk1 = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO tokens (id, token_number, org_id, location_id, queue_id, service_id, state, joined_at) VALUES (?, 'CROSSTK', ?, ?, ?, ?, 'WAITING', ?)", tk1, orgId1, loc1Org1, queue1Loc1, service1Loc1, java.sql.Timestamp.from(t1));

        Instant start = Instant.parse("2022-12-30T00:00:00Z");
        Instant end = Instant.parse("2023-01-05T00:00:00Z");

        AnalyticsTrafficResponse traffic = analyticsService.getTraffic(orgId1, loc1Org1, start, end, "Asia/Tokyo");

        List<com.align.qms.analytics.dto.DailyBucket> daily = traffic.dailyBuckets();
        long jan01 = daily.stream().filter(b -> b.date().equals("2023-01-01")).mapToLong(b -> b.tokensJoined()).sum();
        long jan02 = daily.stream().filter(b -> b.date().equals("2023-01-02")).mapToLong(b -> b.tokensJoined()).sum();

        assertEquals(0, jan01);
        assertEquals(1, jan02);
    }

    @Test
    void testTrafficAnalytics_HalfOpenRange() {
        Instant tStart = Instant.parse("2023-05-01T10:00:00Z");
        Instant tEnd = Instant.parse("2023-05-01T12:00:00Z");

        UUID tk1 = UUID.randomUUID();
        UUID tk2 = UUID.randomUUID();
        jdbcTemplate.update("INSERT INTO tokens (id, token_number, org_id, location_id, queue_id, service_id, state, joined_at) VALUES (?, 'HO-1', ?, ?, ?, ?, 'WAITING', ?)", tk1, orgId1, loc1Org1, queue1Loc1, service1Loc1, java.sql.Timestamp.from(tStart));
        jdbcTemplate.update("INSERT INTO tokens (id, token_number, org_id, location_id, queue_id, service_id, state, joined_at) VALUES (?, 'HO-2', ?, ?, ?, ?, 'WAITING', ?)", tk2, orgId1, loc1Org1, queue1Loc1, service1Loc1, java.sql.Timestamp.from(tEnd));

        AnalyticsTrafficResponse traffic = analyticsService.getTraffic(orgId1, loc1Org1, tStart, tEnd, "UTC");

        List<com.align.qms.analytics.dto.HourlyBucket> hourly = traffic.hourlyBuckets();
        long total = hourly.stream().mapToLong(b -> b.tokensJoined()).sum();

        assertEquals(1, total);
    }
}
