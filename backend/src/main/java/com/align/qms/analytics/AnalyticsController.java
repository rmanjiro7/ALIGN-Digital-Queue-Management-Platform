package com.align.qms.analytics;

import com.align.qms.analytics.dto.*;
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

    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID locationId,
            @RequestParam Instant startDate,
            @RequestParam Instant endDate) {
        return ResponseEntity.ok(analyticsService.getOverview(orgId, locationId, startDate, endDate));
    }

    @GetMapping("/traffic")
    public ResponseEntity<AnalyticsTrafficResponse> getTraffic(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID locationId,
            @RequestParam Instant startDate,
            @RequestParam Instant endDate) {
        return ResponseEntity.ok(analyticsService.getTraffic(orgId, locationId, startDate, endDate));
    }

    @GetMapping("/queues")
    public ResponseEntity<List<QueueAnalyticsResponse>> getQueues(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false) UUID queueId,
            @RequestParam Instant startDate,
            @RequestParam Instant endDate) {
        return ResponseEntity.ok(analyticsService.getQueues(orgId, locationId, queueId, startDate, endDate));
    }

    @GetMapping("/services")
    public ResponseEntity<List<ServiceAnalyticsResponse>> getServices(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID locationId,
            @RequestParam Instant startDate,
            @RequestParam Instant endDate) {
        return ResponseEntity.ok(analyticsService.getServices(orgId, locationId, startDate, endDate));
    }

    @GetMapping("/staff")
    public ResponseEntity<List<StaffAnalyticsResponse>> getStaff(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false) UUID staffId,
            @RequestParam Instant startDate,
            @RequestParam Instant endDate) {
        return ResponseEntity.ok(analyticsService.getStaff(orgId, locationId, staffId, startDate, endDate));
    }

    @GetMapping("/counters")
    public ResponseEntity<List<CounterAnalyticsResponse>> getCounters(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false) UUID counterId,
            @RequestParam Instant startDate,
            @RequestParam Instant endDate) {
        return ResponseEntity.ok(analyticsService.getCounters(orgId, locationId, counterId, startDate, endDate));
    }
}
