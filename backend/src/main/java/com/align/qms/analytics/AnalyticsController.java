package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsSummaryResponse;
import com.align.qms.analytics.dto.QueueAnalyticsResponse;
import com.align.qms.analytics.dto.StaffServiceDurationResponse;
import com.align.qms.analytics.dto.AnalyticsTrafficResponse;
import com.align.qms.analytics.dto.ServiceAnalyticsResponse;
import com.align.qms.analytics.dto.CounterAnalyticsResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@PreAuthorize("hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN')")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public ResponseEntity<AnalyticsSummaryResponse> getSummary(
            @RequestParam UUID orgId,
            @RequestParam Instant start,
            @RequestParam Instant end,
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false) UUID serviceId,
            @RequestParam(required = false) UUID queueId) {
        return ResponseEntity.ok(analyticsService.getSummary(orgId, locationId, serviceId, queueId, start, end));
    }

    @GetMapping("/staff-service-duration")
    public ResponseEntity<List<StaffServiceDurationResponse>> getStaffServiceDuration(
            @RequestParam UUID orgId,
            @RequestParam Instant start,
            @RequestParam Instant end,
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false) UUID staffId) {
        return ResponseEntity.ok(analyticsService.getStaffServiceDuration(orgId, locationId, staffId, start, end));
    }

    @GetMapping("/queues")
    public ResponseEntity<List<QueueAnalyticsResponse>> getQueues(
            @RequestParam UUID orgId,
            @RequestParam Instant start,
            @RequestParam Instant end,
            @RequestParam UUID locationId) {
        return ResponseEntity.ok(analyticsService.getQueueAnalytics(orgId, locationId, start, end));
    }

    @GetMapping("/traffic")
    public ResponseEntity<AnalyticsTrafficResponse> getTraffic(
            @RequestParam UUID orgId,
            @RequestParam Instant start,
            @RequestParam Instant end,
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false, defaultValue = "UTC") String timezone) {
        return ResponseEntity.ok(analyticsService.getTraffic(orgId, locationId, start, end, timezone));
    }

    @GetMapping("/services")
    public ResponseEntity<List<ServiceAnalyticsResponse>> getServices(
            @RequestParam UUID orgId,
            @RequestParam Instant start,
            @RequestParam Instant end,
            @RequestParam(required = false) UUID locationId) {
        return ResponseEntity.ok(analyticsService.getServiceAnalytics(orgId, locationId, start, end));
    }

    @GetMapping("/counters")
    public ResponseEntity<List<CounterAnalyticsResponse>> getCounters(
            @RequestParam UUID orgId,
            @RequestParam Instant start,
            @RequestParam Instant end,
            @RequestParam(required = false) UUID locationId) {
        return ResponseEntity.ok(analyticsService.getCounterAnalytics(orgId, locationId, start, end));
    }
}
