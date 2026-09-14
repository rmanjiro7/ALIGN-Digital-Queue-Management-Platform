package com.align.qms.analytics;

import com.align.qms.analytics.projection.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AnalyticsRepository extends Repository<com.align.qms.token.Token, UUID> {

    // 1. Overview
    @Query(nativeQuery = true, value = """
        SELECT
            -- Demand cohort (based on joined_at)
            COUNT(*) FILTER (WHERE joined_at >= :startDate AND joined_at < :endDate) AS totalTokensIssued,
            COUNT(*) FILTER (WHERE joined_at >= :startDate AND joined_at < :endDate AND state = 'CANCELLED') AS tokensCancelled,
            COUNT(*) FILTER (WHERE joined_at >= :startDate AND joined_at < :endDate AND state = 'EXPIRED') AS tokensExpired,
            
            -- Throughput cohort (based on completed_at)
            COUNT(*) FILTER (WHERE completed_at >= :startDate AND completed_at < :endDate AND state = 'COMPLETED') AS tokensCompleted,
            
            -- No-show cohort (based on called_at)
            COUNT(*) FILTER (WHERE called_at >= :startDate AND called_at < :endDate AND state = 'NO_SHOW') AS tokensNoShow,
            
            -- Real-time active count (snapshot, no date filter)
            COUNT(*) FILTER (WHERE state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE')) AS tokensInProgress,
            
            -- Wait time (cohort: called within period)
            AVG(EXTRACT(EPOCH FROM (called_at - joined_at))) FILTER (WHERE called_at >= :startDate AND called_at < :endDate) AS avgWaitTimeSeconds,
            COUNT(*) FILTER (WHERE called_at >= :startDate AND called_at < :endDate) AS avgWaitTimeSampleSize,
            
            -- Service time (cohort: completed within period)
            AVG(EXTRACT(EPOCH FROM (completed_at - served_at))) FILTER (WHERE completed_at >= :startDate AND completed_at < :endDate AND served_at IS NOT NULL AND state = 'COMPLETED') AS avgServiceTimeSeconds,
            COUNT(*) FILTER (WHERE completed_at >= :startDate AND completed_at < :endDate AND served_at IS NOT NULL AND state = 'COMPLETED') AS avgServiceTimeSampleSize,
            
            -- Journey time (cohort: completed within period)
            AVG(EXTRACT(EPOCH FROM (completed_at - joined_at))) FILTER (WHERE completed_at >= :startDate AND completed_at < :endDate AND state = 'COMPLETED') AS avgJourneyTimeSeconds,
            COUNT(*) FILTER (WHERE completed_at >= :startDate AND completed_at < :endDate AND state = 'COMPLETED') AS avgJourneyTimeSampleSize,
            
            -- Rates
            CASE WHEN COUNT(*) FILTER (WHERE called_at >= :startDate AND called_at < :endDate) > 0 
                 THEN CAST(COUNT(*) FILTER (WHERE called_at >= :startDate AND called_at < :endDate AND state = 'NO_SHOW') AS FLOAT) / COUNT(*) FILTER (WHERE called_at >= :startDate AND called_at < :endDate) 
                 ELSE NULL END AS noShowRate,
                 
            CASE WHEN COUNT(*) FILTER (WHERE joined_at >= :startDate AND joined_at < :endDate) > 0 
                 THEN CAST(COUNT(*) FILTER (WHERE joined_at >= :startDate AND joined_at < :endDate AND state = 'CANCELLED') AS FLOAT) / COUNT(*) FILTER (WHERE joined_at >= :startDate AND joined_at < :endDate) 
                 ELSE NULL END AS cancellationRate
        FROM tokens
        WHERE org_id = :orgId
          AND (:locationId IS NULL OR location_id = CAST(CAST(:locationId AS VARCHAR) AS UUID))
          AND (
               (joined_at >= :startDate AND joined_at < :endDate)
               OR (completed_at >= :startDate AND completed_at < :endDate)
               OR (called_at >= :startDate AND called_at < :endDate)
               OR state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE')
          )
    """)
    OverviewProjection getOverviewMetrics(
            @Param("orgId") UUID orgId,
            @Param("locationId") UUID locationId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    // Peak Hour (calculated separately from demand cohort)
    @Query(nativeQuery = true, value = """
        SELECT CAST(EXTRACT(HOUR FROM joined_at) AS INTEGER) AS peakHour, COUNT(*) AS peakCount
        FROM tokens
        WHERE org_id = :orgId
          AND (:locationId IS NULL OR location_id = CAST(CAST(:locationId AS VARCHAR) AS UUID))
          AND joined_at >= :startDate AND joined_at < :endDate
        GROUP BY EXTRACT(HOUR FROM joined_at)
        ORDER BY peakCount DESC
        LIMIT 1
    """)
    List<Object[]> getPeakHour(
            @Param("orgId") UUID orgId,
            @Param("locationId") UUID locationId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    // 2. Traffic (joined_at vs completed_at by hour)
    @Query(nativeQuery = true, value = """
        WITH hours AS (SELECT generate_series(0, 23) AS h)
        SELECT 
            h.h AS hour,
            COUNT(t_joined.id) AS tokensJoined,
            COUNT(t_completed.id) AS tokensCompleted
        FROM hours h
        LEFT JOIN tokens t_joined ON EXTRACT(HOUR FROM t_joined.joined_at) = h.h 
            AND t_joined.org_id = :orgId 
            AND (:locationId IS NULL OR t_joined.location_id = CAST(CAST(:locationId AS VARCHAR) AS UUID))
            AND t_joined.joined_at >= :startDate AND t_joined.joined_at < :endDate
        LEFT JOIN tokens t_completed ON EXTRACT(HOUR FROM t_completed.completed_at) = h.h 
            AND t_completed.org_id = :orgId 
            AND (:locationId IS NULL OR t_completed.location_id = CAST(CAST(:locationId AS VARCHAR) AS UUID))
            AND t_completed.completed_at >= :startDate AND t_completed.completed_at < :endDate
            AND t_completed.state = 'COMPLETED'
        GROUP BY h.h
        ORDER BY h.h
    """)
    List<HourlyTrafficProjection> getHourlyTraffic(
            @Param("orgId") UUID orgId,
            @Param("locationId") UUID locationId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    // 3. Queues (cohort based on completed_at for throughput/service, joined_at for demand/wait)
    // For simplicity per the prompt, we will use the completed_at cohort for all aggregations here, 
    // except waiting which is real-time.
    @Query(nativeQuery = true, value = """
        SELECT 
            q.id AS queueId,
            q.name AS queueName,
            s.name AS serviceName,
            COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate) AS totalTokens,
            COUNT(t.id) FILTER (WHERE t.completed_at >= :startDate AND t.completed_at < :endDate AND t.state = 'COMPLETED') AS completed,
            COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate AND t.state = 'NO_SHOW') AS noShow,
            COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate AND t.state = 'CANCELLED') AS cancelled,
            COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate AND t.state = 'EXPIRED') AS expired,
            COUNT(t.id) FILTER (WHERE t.state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE')) AS currentWaiting,
            AVG(EXTRACT(EPOCH FROM (t.called_at - t.joined_at))) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate) AS avgWaitTimeSeconds,
            AVG(EXTRACT(EPOCH FROM (t.completed_at - t.served_at))) FILTER (WHERE t.completed_at >= :startDate AND t.completed_at < :endDate AND t.served_at IS NOT NULL AND t.state = 'COMPLETED') AS avgServiceTimeSeconds,
            CASE WHEN COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate) > 0 
                 THEN CAST(COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate AND t.state = 'NO_SHOW') AS FLOAT) / COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate)
                 ELSE NULL END AS noShowRate,
            CASE WHEN COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate) > 0 
                 THEN CAST(COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate AND t.state = 'CANCELLED') AS FLOAT) / COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate)
                 ELSE NULL END AS cancellationRate
        FROM queues q
        JOIN services s ON q.service_id = s.id
        LEFT JOIN tokens t ON t.queue_id = q.id 
            AND (
                 (t.joined_at >= :startDate AND t.joined_at < :endDate) OR 
                 (t.completed_at >= :startDate AND t.completed_at < :endDate) OR 
                 (t.called_at >= :startDate AND t.called_at < :endDate) OR 
                 (t.state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE'))
            )
        WHERE q.org_id = :orgId
          AND (:locationId IS NULL OR q.location_id = CAST(CAST(:locationId AS VARCHAR) AS UUID))
          AND (:queueId IS NULL OR q.id = CAST(CAST(:queueId AS VARCHAR) AS UUID))
        GROUP BY q.id, q.name, s.name
        ORDER BY q.name
    """)
    List<QueueMetricsProjection> getQueueMetrics(
            @Param("orgId") UUID orgId,
            @Param("locationId") UUID locationId,
            @Param("queueId") UUID queueId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    // 4. Services (similar to queues)
    @Query(nativeQuery = true, value = """
        SELECT 
            s.id AS serviceId,
            s.name AS serviceName,
            COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate) AS totalTokens,
            COUNT(t.id) FILTER (WHERE t.completed_at >= :startDate AND t.completed_at < :endDate AND t.state = 'COMPLETED') AS completed,
            COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate AND t.state = 'NO_SHOW') AS noShow,
            COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate AND t.state = 'CANCELLED') AS cancelled,
            COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate AND t.state = 'EXPIRED') AS expired,
            COUNT(t.id) FILTER (WHERE t.state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE')) AS currentWaiting,
            AVG(EXTRACT(EPOCH FROM (t.called_at - t.joined_at))) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate) AS avgWaitTimeSeconds,
            AVG(EXTRACT(EPOCH FROM (t.completed_at - t.served_at))) FILTER (WHERE t.completed_at >= :startDate AND t.completed_at < :endDate AND t.served_at IS NOT NULL AND t.state = 'COMPLETED') AS avgServiceTimeSeconds,
            CASE WHEN COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate) > 0 
                 THEN CAST(COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate AND t.state = 'NO_SHOW') AS FLOAT) / COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate)
                 ELSE NULL END AS noShowRate,
            CASE WHEN COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate) > 0 
                 THEN CAST(COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate AND t.state = 'CANCELLED') AS FLOAT) / COUNT(t.id) FILTER (WHERE t.joined_at >= :startDate AND t.joined_at < :endDate)
                 ELSE NULL END AS cancellationRate
        FROM services s
        LEFT JOIN tokens t ON t.service_id = s.id 
            AND (
                 (t.joined_at >= :startDate AND t.joined_at < :endDate) OR 
                 (t.completed_at >= :startDate AND t.completed_at < :endDate) OR 
                 (t.called_at >= :startDate AND t.called_at < :endDate) OR 
                 (t.state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE'))
            )
        WHERE s.org_id = :orgId
          AND (:locationId IS NULL OR s.location_id = CAST(CAST(:locationId AS VARCHAR) AS UUID))
        GROUP BY s.id, s.name
        ORDER BY s.name
    """)
    List<ServiceMetricsProjection> getServiceMetrics(
            @Param("orgId") UUID orgId,
            @Param("locationId") UUID locationId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    // 5. Staff
    @Query(nativeQuery = true, value = """
        SELECT 
            u.id AS staffId,
            u.name AS staffName,
            COUNT(t.id) FILTER (WHERE t.completed_at >= :startDate AND t.completed_at < :endDate AND t.state = 'COMPLETED') AS tokensCompleted,
            COUNT(t.id) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate AND t.state = 'NO_SHOW') AS tokensNoShow,
            AVG(EXTRACT(EPOCH FROM (t.called_at - t.joined_at))) FILTER (WHERE t.called_at >= :startDate AND t.called_at < :endDate) AS avgWaitTimeSeconds,
            AVG(EXTRACT(EPOCH FROM (t.completed_at - t.served_at))) FILTER (WHERE t.completed_at >= :startDate AND t.completed_at < :endDate AND t.served_at IS NOT NULL AND t.state = 'COMPLETED') AS avgServiceTimeSeconds
        FROM users u
        LEFT JOIN tokens t ON t.called_by_staff_id = u.id 
            AND (
                 (t.completed_at >= :startDate AND t.completed_at < :endDate) OR 
                 (t.called_at >= :startDate AND t.called_at < :endDate)
            )
        WHERE u.org_id = :orgId
          AND u.role = 'STAFF'
          AND (:locationId IS NULL OR u.location_id = CAST(CAST(:locationId AS VARCHAR) AS UUID))
          AND (:staffId IS NULL OR u.id = CAST(CAST(:staffId AS VARCHAR) AS UUID))
        GROUP BY u.id, u.name
        ORDER BY u.name
    """)
    List<StaffMetricsProjection> getStaffMetrics(
            @Param("orgId") UUID orgId,
            @Param("locationId") UUID locationId,
            @Param("staffId") UUID staffId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    // 6. Counters
    @Query(nativeQuery = true, value = """
        SELECT 
            c.id AS counterId,
            c.number AS counterNumber,
            c.name AS counterName,
            c.availability AS currentAvailability,
            COUNT(t.id) FILTER (WHERE t.completed_at >= :startDate AND t.completed_at < :endDate AND t.state = 'COMPLETED') AS tokensCompleted,
            AVG(EXTRACT(EPOCH FROM (t.completed_at - t.served_at))) FILTER (WHERE t.completed_at >= :startDate AND t.completed_at < :endDate AND t.served_at IS NOT NULL AND t.state = 'COMPLETED') AS avgServiceTimeSeconds
        FROM counters c
        LEFT JOIN tokens t ON t.counter_id = c.id 
            AND t.completed_at >= :startDate AND t.completed_at < :endDate 
            AND t.state = 'COMPLETED'
        WHERE c.org_id = :orgId
          AND (:locationId IS NULL OR c.location_id = CAST(CAST(:locationId AS VARCHAR) AS UUID))
          AND (:counterId IS NULL OR c.id = CAST(CAST(:counterId AS VARCHAR) AS UUID))
        GROUP BY c.id, c.number, c.name, c.availability
        ORDER BY c.number
    """)
    List<CounterMetricsProjection> getCounterMetrics(
            @Param("orgId") UUID orgId,
            @Param("locationId") UUID locationId,
            @Param("counterId") UUID counterId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);
}
