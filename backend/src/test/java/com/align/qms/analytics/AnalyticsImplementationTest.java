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

        AnalyticsTrafficResponse traffic = analyticsService.getTraffic(orgId1, loc1Org1, start, end);
        assertNotNull(traffic);
        assertFalse(traffic.hourlyBuckets().isEmpty());
        assertTrue(traffic.dailyBuckets().isEmpty());
    }

    @Test
    void testTrafficAnalytics_Daily() {
        Instant start = baseTime.minus(2, ChronoUnit.DAYS);
        Instant end = baseTime.plus(5, ChronoUnit.DAYS);

        AnalyticsTrafficResponse traffic = analyticsService.getTraffic(orgId1, loc1Org1, start, end);
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
}
