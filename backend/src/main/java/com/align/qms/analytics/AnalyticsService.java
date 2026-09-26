package com.align.qms.analytics;

import com.align.qms.analytics.dto.AnalyticsSummaryResponse;
import com.align.qms.analytics.dto.QueueAnalyticsResponse;
import com.align.qms.analytics.dto.StaffServiceDurationResponse;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final AnalyticsRepository analyticsRepository;
    private final QueueRepository queueRepository;
    private final OrganizationRepository organizationRepository;

    public AnalyticsService(AnalyticsRepository analyticsRepository, QueueRepository queueRepository, OrganizationRepository organizationRepository) {
        this.analyticsRepository = analyticsRepository;
        this.queueRepository = queueRepository;
        this.organizationRepository = organizationRepository;
    }
    
    private void requireOrgExistsAndAccess(UUID orgId) {
        organizationRepository.findById(orgId)
            .orElseThrow(() -> new com.align.qms.exception.OrganizationNotFoundException(orgId));
        TenantContext.requireSameTenant(orgId);
    }

    public AnalyticsSummaryResponse getSummary(UUID orgId, UUID locationId, UUID serviceId, UUID queueId, Instant start, Instant end) {
        requireOrgExistsAndAccess(orgId);
        
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
        requireOrgExistsAndAccess(orgId);
        return analyticsRepository.getStaffServiceDuration(orgId, locationId, staffId, start, end);
    }

    public List<QueueAnalyticsResponse> getQueueAnalytics(UUID orgId, UUID locationId, Instant start, Instant end) {
        requireOrgExistsAndAccess(orgId);
        
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
}
