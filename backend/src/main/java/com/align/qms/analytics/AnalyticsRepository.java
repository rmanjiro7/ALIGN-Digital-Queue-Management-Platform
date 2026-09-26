package com.align.qms.analytics;

import com.align.qms.analytics.dto.StaffServiceDurationResponse;
import com.align.qms.token.TokenState;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class AnalyticsRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public long getOperationalTokenVolume(UUID orgId, UUID locationId, UUID serviceId, UUID queueId, Instant start, Instant end) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(t.id) FROM tokens t WHERE t.org_id = :orgId AND t.joined_at >= :start AND t.joined_at < :end");
        if (locationId != null) sql.append(" AND t.location_id = :locationId");
        if (serviceId != null) sql.append(" AND t.service_id = :serviceId");
        if (queueId != null) sql.append(" AND t.queue_id = :queueId");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("orgId", orgId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (locationId != null) query.setParameter("locationId", locationId);
        if (serviceId != null) query.setParameter("serviceId", serviceId);
        if (queueId != null) query.setParameter("queueId", queueId);

        return ((Number) query.getSingleResult()).longValue();
    }

    public long getCompletedTokens(UUID orgId, UUID locationId, UUID serviceId, UUID queueId, Instant start, Instant end) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(t.id) FROM tokens t WHERE t.org_id = :orgId AND t.state = 'COMPLETED' AND t.completed_at >= :start AND t.completed_at < :end");
        if (locationId != null) sql.append(" AND t.location_id = :locationId");
        if (serviceId != null) sql.append(" AND t.service_id = :serviceId");
        if (queueId != null) sql.append(" AND t.queue_id = :queueId");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("orgId", orgId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (locationId != null) query.setParameter("locationId", locationId);
        if (serviceId != null) query.setParameter("serviceId", serviceId);
        if (queueId != null) query.setParameter("queueId", queueId);

        return ((Number) query.getSingleResult()).longValue();
    }

    public long getEventVolume(UUID orgId, UUID locationId, UUID serviceId, UUID queueId, Instant start, Instant end, String eventType) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(e.id) FROM token_events e JOIN tokens t ON e.token_id = t.id WHERE e.org_id = :orgId AND e.event_type = :eventType AND e.created_at >= :start AND e.created_at < :end");
        if (locationId != null) sql.append(" AND t.location_id = :locationId");
        if (serviceId != null) sql.append(" AND t.service_id = :serviceId");
        if (queueId != null) sql.append(" AND t.queue_id = :queueId");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("orgId", orgId);
        query.setParameter("eventType", eventType);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (locationId != null) query.setParameter("locationId", locationId);
        if (serviceId != null) query.setParameter("serviceId", serviceId);
        if (queueId != null) query.setParameter("queueId", queueId);

        return ((Number) query.getSingleResult()).longValue();
    }

    public long getCurrentQueueLoad(UUID orgId, UUID locationId, UUID serviceId, UUID queueId) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(t.id) FROM tokens t WHERE t.org_id = :orgId AND t.state IN ('WAITING', 'CALLED', 'IN_SERVICE', 'AWAY')");
        if (locationId != null) sql.append(" AND t.location_id = :locationId");
        if (serviceId != null) sql.append(" AND t.service_id = :serviceId");
        if (queueId != null) sql.append(" AND t.queue_id = :queueId");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("orgId", orgId);
        if (locationId != null) query.setParameter("locationId", locationId);
        if (serviceId != null) query.setParameter("serviceId", serviceId);
        if (queueId != null) query.setParameter("queueId", queueId);

        return ((Number) query.getSingleResult()).longValue();
    }

    @SuppressWarnings("unchecked")
    public List<StaffServiceDurationResponse> getStaffServiceDuration(UUID orgId, UUID locationId, UUID staffId, Instant start, Instant end) {
        StringBuilder sql = new StringBuilder(
            "SELECT called_by_staff_id, COUNT(id), AVG(EXTRACT(EPOCH FROM (completed_at - served_at))) " +
            "FROM tokens WHERE org_id = :orgId AND state = 'COMPLETED' AND completed_at >= :start AND completed_at < :end " +
            "AND called_by_staff_id IS NOT NULL"
        );
        if (locationId != null) sql.append(" AND location_id = :locationId");
        if (staffId != null) sql.append(" AND called_by_staff_id = :staffId");
        
        sql.append(" GROUP BY called_by_staff_id");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("orgId", orgId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (locationId != null) query.setParameter("locationId", locationId);
        if (staffId != null) query.setParameter("staffId", staffId);

        List<Object[]> results = query.getResultList();
        List<StaffServiceDurationResponse> responses = new ArrayList<>();
        
        for (Object[] row : results) {
            UUID sId = row[0] != null ? UUID.fromString(row[0].toString()) : null;
            long count = ((Number) row[1]).longValue();
            Double avgDuration = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            
            responses.add(new StaffServiceDurationResponse(sId, count, avgDuration));
        }
        
        return responses;
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getTrafficByTimezone(UUID orgId, UUID locationId, Instant start, Instant end, String timezone) {
        StringBuilder sql = new StringBuilder(
            "SELECT CAST(DATE(joined_at AT TIME ZONE :timezone) AS VARCHAR) as local_date, " +
            "CAST(EXTRACT(HOUR FROM joined_at AT TIME ZONE :timezone) AS INTEGER) as local_hour, " +
            "COUNT(id) as joined, " +
            "SUM(CASE WHEN state = 'COMPLETED' THEN 1 ELSE 0 END) as completed " +
            "FROM tokens WHERE org_id = :orgId AND joined_at >= :start AND joined_at < :end"
        );
        if (locationId != null) sql.append(" AND location_id = :locationId");
        sql.append(" GROUP BY local_date, local_hour");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("orgId", orgId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        query.setParameter("timezone", timezone);
        if (locationId != null) query.setParameter("locationId", locationId);

        return query.getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getServiceAnalytics(UUID orgId, UUID locationId, Instant start, Instant end) {
        StringBuilder sql = new StringBuilder(
            "SELECT t.service_id, s.name, COUNT(t.id) as op_vol, " +
            "SUM(CASE WHEN t.state = 'COMPLETED' THEN 1 ELSE 0 END) as comp, " +
            "SUM(CASE WHEN t.state = 'NO_SHOW' THEN 1 ELSE 0 END) as ns, " +
            "SUM(CASE WHEN t.state = 'CANCELLED' THEN 1 ELSE 0 END) as canc, " +
            "SUM(CASE WHEN t.state = 'TRANSFERRED' THEN 1 ELSE 0 END) as trans, " +
            "AVG(CASE WHEN t.state = 'COMPLETED' THEN EXTRACT(EPOCH FROM (t.completed_at - t.served_at)) ELSE NULL END) as avg_duration " +
            "FROM tokens t JOIN services s ON t.service_id = s.id " +
            "WHERE t.org_id = :orgId AND t.joined_at >= :start AND t.joined_at < :end"
        );
        if (locationId != null) sql.append(" AND t.location_id = :locationId");
        sql.append(" GROUP BY t.service_id, s.name");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("orgId", orgId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (locationId != null) query.setParameter("locationId", locationId);

        return query.getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getCounterAnalytics(UUID orgId, UUID locationId, Instant start, Instant end) {
        StringBuilder sql = new StringBuilder(
            "SELECT t.counter_id, c.name, COUNT(t.id) as op_vol, " +
            "SUM(CASE WHEN t.state = 'COMPLETED' THEN 1 ELSE 0 END) as comp, " +
            "SUM(CASE WHEN t.state = 'NO_SHOW' THEN 1 ELSE 0 END) as ns, " +
            "SUM(CASE WHEN t.state = 'CANCELLED' THEN 1 ELSE 0 END) as canc, " +
            "SUM(CASE WHEN t.state = 'TRANSFERRED' THEN 1 ELSE 0 END) as trans, " +
            "AVG(CASE WHEN t.state = 'COMPLETED' THEN EXTRACT(EPOCH FROM (t.completed_at - t.served_at)) ELSE NULL END) as avg_duration " +
            "FROM tokens t JOIN counters c ON t.counter_id = c.id " +
            "WHERE t.org_id = :orgId AND t.joined_at >= :start AND t.joined_at < :end"
        );
        if (locationId != null) sql.append(" AND t.location_id = :locationId");
        sql.append(" GROUP BY t.counter_id, c.name");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("orgId", orgId);
        query.setParameter("start", start);
        query.setParameter("end", end);
        if (locationId != null) query.setParameter("locationId", locationId);

        return query.getResultList();
    }
}
