package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsSummaryResponse;
import com.align.qms.analytics.dto.QueueAnalyticsResponse;
import com.align.qms.analytics.dto.StaffServiceDurationResponse;
import com.align.qms.exception.LocationNotFoundException;
import com.align.qms.location.LocationRepository;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final AnalyticsRepository analyticsRepository;
    private final QueueRepository queueRepository;
    private final OrganizationRepository organizationRepository;
    private final LocationRepository locationRepository;

    public AnalyticsService(
            AnalyticsRepository analyticsRepository,
            QueueRepository queueRepository,
            OrganizationRepository organizationRepository,
            LocationRepository locationRepository) {
        this.analyticsRepository = analyticsRepository;
        this.queueRepository = queueRepository;
        this.organizationRepository = organizationRepository;
        this.locationRepository = locationRepository;
    }
    
    private void requireOrgExistsAndAccess(UUID orgId) {
        organizationRepository.findById(orgId)
            .orElseThrow(() -> new com.align.qms.exception.OrganizationNotFoundException(orgId));
        TenantContext.requireSameTenant(orgId);
    }

    private void requireOrgAndLocationAccess(UUID orgId, UUID locationId) {
        requireOrgExistsAndAccess(orgId);

        if (locationId != null
                && !locationRepository.existsByIdAndOrgId(locationId, orgId)) {
            throw new LocationNotFoundException(locationId);
        }
    }

    public AnalyticsSummaryResponse getSummary(UUID orgId, UUID locationId, UUID serviceId, UUID queueId, Instant start, Instant end) {
        requireOrgAndLocationAccess(orgId, locationId);
        
        long opVolume = analyticsRepository.getOperationalTokenVolume(orgId, locationId, serviceId, queueId, start, end);
        long qVolume = opVolume; // For summary, queue volume is same as op volume since it's just filtered tokens
        long completed = analyticsRepository.getCompletedTokens(orgId, locationId, serviceId, queueId, start, end);
        long noShows = analyticsRepository.getEventVolume(orgId, locationId, serviceId, queueId, start, end, "TOKEN_NO_SHOW");
        long cancellations = analyticsRepository.getEventVolume(orgId, locationId, serviceId, queueId, start, end, "TOKEN_CANCELLED");
        long transfers = analyticsRepository.getEventVolume(orgId, locationId, serviceId, queueId, start, end, "TOKEN_TRANSFERRED");
        long currentLoad = analyticsRepository.getCurrentQueueLoad(orgId, locationId, serviceId, queueId);

        AnalyticsSummaryResponse response = new AnalyticsSummaryResponse();
        response.setOperationalTokenVolume(opVolume);
        response.setQueueVolume(qVolume);
        response.setCompletedTokens(completed);
        response.setNoShows(noShows);
        response.setCancellations(cancellations);
        response.setTransfers(transfers);
        response.setCurrentQueueLoad(currentLoad);

        // Safe division for rates
        response.setCompletionRate(opVolume > 0 ? (double) completed / opVolume : 0.0);
        response.setNoShowRate(opVolume > 0 ? (double) noShows / opVolume : 0.0);
        response.setCancellationRate(opVolume > 0 ? (double) cancellations / opVolume : 0.0);

        return response;
    }

    public List<StaffServiceDurationResponse> getStaffServiceDuration(UUID orgId, UUID locationId, UUID staffId, Instant start, Instant end) {
        requireOrgAndLocationAccess(orgId, locationId);
        return analyticsRepository.getStaffServiceDuration(orgId, locationId, staffId, start, end);
    }

    public List<QueueAnalyticsResponse> getQueueAnalytics(UUID orgId, UUID locationId, Instant start, Instant end) {
        requireOrgAndLocationAccess(orgId, locationId);
        
        // Authorization & tenant validation happens by using orgId and locationId
        List<Queue> queues = queueRepository.findByLocationIdOrderByNameAsc(locationId);
        List<QueueAnalyticsResponse> responses = new ArrayList<>();
        
        for (Queue queue : queues) {
            // Verify tenant isolation just in case
            if (!queue.getOrgId().equals(orgId)) continue;
            
            UUID queueId = queue.getId();
            long opVolume = analyticsRepository.getOperationalTokenVolume(orgId, locationId, null, queueId, start, end);
            long completed = analyticsRepository.getCompletedTokens(orgId, locationId, null, queueId, start, end);
            long noShows = analyticsRepository.getEventVolume(orgId, locationId, null, queueId, start, end, "TOKEN_NO_SHOW");
            long cancellations = analyticsRepository.getEventVolume(orgId, locationId, null, queueId, start, end, "TOKEN_CANCELLED");
            long transfers = analyticsRepository.getEventVolume(orgId, locationId, null, queueId, start, end, "TOKEN_TRANSFERRED");
            long currentLoad = analyticsRepository.getCurrentQueueLoad(orgId, locationId, null, queueId);

            QueueAnalyticsResponse r = new QueueAnalyticsResponse();
            r.setQueueId(queueId);
            r.setQueueName(queue.getName());
            r.setOperationalTokenVolume(opVolume);
            r.setCompletedTokens(completed);
            r.setNoShows(noShows);
            r.setCancellations(cancellations);
            r.setTransfers(transfers);
            r.setCurrentQueueLoad(currentLoad);
            
            r.setCompletionRate(opVolume > 0 ? (double) completed / opVolume : 0.0);
            r.setNoShowRate(opVolume > 0 ? (double) noShows / opVolume : 0.0);
            r.setCancellationRate(opVolume > 0 ? (double) cancellations / opVolume : 0.0);
            
            responses.add(r);
        }
        
        return responses;
    }

    public com.align.qms.analytics.dto.AnalyticsTrafficResponse getTraffic(UUID orgId, UUID locationId, Instant start, Instant end, String timezone) {
        requireOrgAndLocationAccess(orgId, locationId);
        List<Object[]> rows = analyticsRepository.getTrafficByTimezone(orgId, locationId, start, end, timezone);
        
        List<com.align.qms.analytics.dto.HourlyBucket> hourly = new ArrayList<>();
        List<com.align.qms.analytics.dto.DailyBucket> daily = new ArrayList<>();
        
        // Compute duration to see if it's > 24 hours
        long totalHours = java.time.Duration.between(start, end).toHours();
        boolean isMultiDay = totalHours > 24;

        if (isMultiDay) {
            // Aggregate into daily buckets using local calendar date
            java.util.Map<String, com.align.qms.analytics.dto.DailyBucket> dailyMap = new java.util.HashMap<>();
            for (Object[] row : rows) {
                String localDateStr = (String) row[0];
                long joined = ((Number) row[2]).longValue();
                long comp = ((Number) row[3]).longValue();
                
                com.align.qms.analytics.dto.DailyBucket b = dailyMap.getOrDefault(localDateStr,
                    new com.align.qms.analytics.dto.DailyBucket(localDateStr, 0L, 0L));
                dailyMap.put(localDateStr, new com.align.qms.analytics.dto.DailyBucket(
                    b.date(), b.tokensJoined() + joined, b.tokensCompleted() + comp));
            }
            daily.addAll(dailyMap.values());
            // Sort by date string
            daily.sort(java.util.Comparator.comparing(com.align.qms.analytics.dto.DailyBucket::date));
        } else {
            // Aggregate into hourly buckets using local calendar hour
            java.util.Map<Integer, com.align.qms.analytics.dto.HourlyBucket> hourMap = new java.util.HashMap<>();
            for (Object[] row : rows) {
                int localHour = ((Number) row[1]).intValue();
                long joined = ((Number) row[2]).longValue();
                long comp = ((Number) row[3]).longValue();
                
                com.align.qms.analytics.dto.HourlyBucket b = hourMap.getOrDefault(localHour,
                    new com.align.qms.analytics.dto.HourlyBucket(localHour, 0L, 0L));
                hourMap.put(localHour, new com.align.qms.analytics.dto.HourlyBucket(
                    b.hour(), b.tokensJoined() + joined, b.tokensCompleted() + comp));
            }
            hourly.addAll(hourMap.values());
            hourly.sort(java.util.Comparator.comparing(com.align.qms.analytics.dto.HourlyBucket::hour));
        }

        return new com.align.qms.analytics.dto.AnalyticsTrafficResponse(hourly, daily);
    }

    public List<com.align.qms.analytics.dto.ServiceAnalyticsResponse> getServiceAnalytics(UUID orgId, UUID locationId, Instant start, Instant end) {
        requireOrgAndLocationAccess(orgId, locationId);
        List<Object[]> rows = analyticsRepository.getServiceAnalytics(orgId, locationId, start, end);
        List<com.align.qms.analytics.dto.ServiceAnalyticsResponse> res = new ArrayList<>();
        for (Object[] row : rows) {
            long opVol = ((Number) row[2]).longValue();
            long comp = ((Number) row[3]).longValue();
            long ns = ((Number) row[4]).longValue();
            long canc = ((Number) row[5]).longValue();
            long trans = ((Number) row[6]).longValue();
            Number avgDurObj = (Number) row[7];
            Integer avgDur = avgDurObj != null ? avgDurObj.intValue() : null;

            UUID serviceId = row[0] != null ? UUID.fromString(row[0].toString()) : null;
            res.add(new com.align.qms.analytics.dto.ServiceAnalyticsResponse(
                serviceId,
                (String) row[1],
                opVol,
                comp,
                ns,
                canc,
                trans,
                opVol > 0 ? (double) comp / opVol : 0.0,
                opVol > 0 ? (double) ns / opVol : 0.0,
                opVol > 0 ? (double) canc / opVol : 0.0,
                avgDur
            ));
        }
        return res;
    }

    public List<com.align.qms.analytics.dto.CounterAnalyticsResponse> getCounterAnalytics(UUID orgId, UUID locationId, Instant start, Instant end) {
        requireOrgAndLocationAccess(orgId, locationId);
        List<Object[]> rows = analyticsRepository.getCounterAnalytics(orgId, locationId, start, end);
        List<com.align.qms.analytics.dto.CounterAnalyticsResponse> res = new ArrayList<>();
        for (Object[] row : rows) {
            UUID counterId = row[0] != null ? UUID.fromString(row[0].toString()) : null;
            String counterName = row[1] != null ? (String) row[1] : "Unknown Counter";
            long opVol = ((Number) row[2]).longValue();
            long comp = ((Number) row[3]).longValue();
            long ns = ((Number) row[4]).longValue();
            long canc = ((Number) row[5]).longValue();
            long trans = ((Number) row[6]).longValue();
            Number avgDurObj = (Number) row[7];
            Integer avgDur = avgDurObj != null ? avgDurObj.intValue() : null;

            res.add(new com.align.qms.analytics.dto.CounterAnalyticsResponse(
                counterId,
                counterName,
                opVol,
                comp,
                ns,
                canc,
                trans,
                avgDur
            ));
        }
        return res;
    }
}
