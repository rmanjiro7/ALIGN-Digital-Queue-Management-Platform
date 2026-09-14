package com.align.qms.analytics;

import com.align.qms.analytics.dto.*;
import com.align.qms.analytics.projection.*;
import com.align.qms.location.LocationRepository;
import com.align.qms.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final AnalyticsRepository analyticsRepository;
    private final LocationRepository locationRepository;

    public AnalyticsService(AnalyticsRepository analyticsRepository, LocationRepository locationRepository) {
        this.analyticsRepository = analyticsRepository;
        this.locationRepository = locationRepository;
    }

    public AnalyticsOverviewResponse getOverview(UUID requestedOrgId, UUID locationId, Instant startDate, Instant endDate) {
        UUID orgId = resolveAndValidateScope(requestedOrgId, locationId);
        validateDates(startDate, endDate);
        
        OverviewProjection p = analyticsRepository.getOverviewMetrics(orgId, locationId, startDate, endDate);
        
        Integer peakHour = null;
        Long peakHourTokenCount = null;
        
        List<Object[]> peakList = analyticsRepository.getPeakHour(orgId, locationId, startDate, endDate);
        if (!peakList.isEmpty()) {
            Object[] peak = peakList.get(0);
            peakHour = ((Number) peak[0]).intValue();
            peakHourTokenCount = ((Number) peak[1]).longValue();
        }

        return new AnalyticsOverviewResponse(
            p.getTotalTokensIssued() == null ? 0L : p.getTotalTokensIssued(),
            p.getTokensCompleted() == null ? 0L : p.getTokensCompleted(),
            p.getTokensNoShow() == null ? 0L : p.getTokensNoShow(),
            p.getTokensCancelled() == null ? 0L : p.getTokensCancelled(),
            p.getTokensExpired() == null ? 0L : p.getTokensExpired(),
            p.getTokensInProgress() == null ? 0L : p.getTokensInProgress(),
            p.getAvgWaitTimeSeconds(),
            p.getAvgWaitTimeSampleSize() == null ? 0L : p.getAvgWaitTimeSampleSize(),
            p.getAvgServiceTimeSeconds(),
            p.getAvgServiceTimeSampleSize() == null ? 0L : p.getAvgServiceTimeSampleSize(),
            p.getAvgJourneyTimeSeconds(),
            p.getAvgJourneyTimeSampleSize() == null ? 0L : p.getAvgJourneyTimeSampleSize(),
            p.getNoShowRate(),
            p.getCancellationRate(),
            peakHour,
            peakHourTokenCount
        );
    }

    public AnalyticsTrafficResponse getTraffic(UUID requestedOrgId, UUID locationId, Instant startDate, Instant endDate) {
        UUID orgId = resolveAndValidateScope(requestedOrgId, locationId);
        validateDates(startDate, endDate);
        
        List<HourlyTrafficProjection> projections = analyticsRepository.getHourlyTraffic(orgId, locationId, startDate, endDate);
        List<HourlyBucket> buckets = new ArrayList<>();
        
        // Zero-fill 24 hours just in case
        for (int i = 0; i < 24; i++) {
            final int h = i;
            HourlyTrafficProjection p = projections.stream().filter(pr -> pr.getHour() == h).findFirst().orElse(null);
            if (p != null) {
                buckets.add(new HourlyBucket(
                    p.getHour(), 
                    p.getTokensJoined() == null ? 0L : p.getTokensJoined(), 
                    p.getTokensCompleted() == null ? 0L : p.getTokensCompleted()
                ));
            } else {
                buckets.add(new HourlyBucket(h, 0L, 0L));
            }
        }
        
        return new AnalyticsTrafficResponse(buckets);
    }

    public List<QueueAnalyticsResponse> getQueues(UUID requestedOrgId, UUID locationId, UUID queueId, Instant startDate, Instant endDate) {
        UUID orgId = resolveAndValidateScope(requestedOrgId, locationId);
        validateDates(startDate, endDate);
        
        return analyticsRepository.getQueueMetrics(orgId, locationId, queueId, startDate, endDate).stream()
            .map(p -> new QueueAnalyticsResponse(
                p.getQueueId(),
                p.getQueueName(),
                p.getServiceName(),
                p.getTotalTokens() == null ? 0L : p.getTotalTokens(),
                p.getCompleted() == null ? 0L : p.getCompleted(),
                p.getNoShow() == null ? 0L : p.getNoShow(),
                p.getCancelled() == null ? 0L : p.getCancelled(),
                p.getExpired() == null ? 0L : p.getExpired(),
                p.getCurrentWaiting() == null ? 0L : p.getCurrentWaiting(),
                p.getAvgWaitTimeSeconds(),
                p.getAvgServiceTimeSeconds(),
                p.getNoShowRate(),
                p.getCancellationRate()
            )).collect(Collectors.toList());
    }

    public List<ServiceAnalyticsResponse> getServices(UUID requestedOrgId, UUID locationId, Instant startDate, Instant endDate) {
        UUID orgId = resolveAndValidateScope(requestedOrgId, locationId);
        validateDates(startDate, endDate);
        
        return analyticsRepository.getServiceMetrics(orgId, locationId, startDate, endDate).stream()
            .map(p -> new ServiceAnalyticsResponse(
                p.getServiceId(),
                p.getServiceName(),
                p.getTotalTokens() == null ? 0L : p.getTotalTokens(),
                p.getCompleted() == null ? 0L : p.getCompleted(),
                p.getNoShow() == null ? 0L : p.getNoShow(),
                p.getCancelled() == null ? 0L : p.getCancelled(),
                p.getExpired() == null ? 0L : p.getExpired(),
                p.getCurrentWaiting() == null ? 0L : p.getCurrentWaiting(),
                p.getAvgWaitTimeSeconds(),
                p.getAvgServiceTimeSeconds(),
                p.getNoShowRate(),
                p.getCancellationRate()
            )).collect(Collectors.toList());
    }

    public List<StaffAnalyticsResponse> getStaff(UUID requestedOrgId, UUID locationId, UUID staffId, Instant startDate, Instant endDate) {
        UUID orgId = resolveAndValidateScope(requestedOrgId, locationId);
        validateDates(startDate, endDate);
        
        return analyticsRepository.getStaffMetrics(orgId, locationId, staffId, startDate, endDate).stream()
            .map(p -> new StaffAnalyticsResponse(
                p.getStaffId(),
                p.getStaffName(),
                p.getTokensCompleted() == null ? 0L : p.getTokensCompleted(),
                p.getAvgWaitTimeSeconds(),
                p.getAvgServiceTimeSeconds(),
                p.getTokensNoShow() == null ? 0L : p.getTokensNoShow()
            )).collect(Collectors.toList());
    }

    public List<CounterAnalyticsResponse> getCounters(UUID requestedOrgId, UUID locationId, UUID counterId, Instant startDate, Instant endDate) {
        UUID orgId = resolveAndValidateScope(requestedOrgId, locationId);
        validateDates(startDate, endDate);
        
        return analyticsRepository.getCounterMetrics(orgId, locationId, counterId, startDate, endDate).stream()
            .map(p -> new CounterAnalyticsResponse(
                p.getCounterId(),
                p.getCounterNumber(),
                p.getCounterName(),
                p.getCurrentAvailability(),
                p.getTokensCompleted() == null ? 0L : p.getTokensCompleted(),
                p.getAvgServiceTimeSeconds()
            )).collect(Collectors.toList());
    }

    private UUID resolveAndValidateScope(UUID requestedOrgId, UUID locationId) {
        UUID orgId;
        if (TenantContext.isPlatformAdmin()) {
            if (requestedOrgId == null) {
                throw new IllegalArgumentException("orgId is required for PLATFORM_ADMIN");
            }
            orgId = requestedOrgId;
        } else {
            orgId = TenantContext.getCurrentOrgId();
            if (requestedOrgId != null && !orgId.equals(requestedOrgId)) {
                throw new IllegalArgumentException("Cannot request analytics for a different organization");
            }
        }
        
        if (locationId != null) {
            if (!locationRepository.existsByIdAndOrgId(locationId, orgId)) {
                throw new IllegalArgumentException("Location does not belong to the requested organization");
            }
        }
        
        return orgId;
    }
    
    private void validateDates(Instant startDate, Instant endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("startDate and endDate are required");
        }
        if (!startDate.isBefore(endDate)) {
            throw new IllegalArgumentException("startDate must be before endDate");
        }
        if (endDate.isAfter(startDate.plus(365, ChronoUnit.DAYS))) {
            throw new IllegalArgumentException("Date range cannot exceed 365 days");
        }
    }
}
