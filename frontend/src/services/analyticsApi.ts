import { apiClient } from './apiClient';
import { AnalyticsTrafficResponse, ServiceAnalyticsResponse, CounterAnalyticsResponse } from '../types';

// ── Phase 6.8.2 Backend DTO Type Mappings ───────────────────────────────────

/** Maps to com.align.qms.analytics.dto.AnalyticsSummaryResponse */
export interface AnalyticsSummaryResponse {
    operationalTokenVolume: number;
    queueVolume: number;
    completedTokens: number;
    noShows: number;
    cancellations: number;
    transfers: number;
    completionRate: number;
    noShowRate: number;
    cancellationRate: number;
    currentQueueLoad: number;
}

/** Maps to com.align.qms.analytics.dto.QueueAnalyticsResponse */
export interface QueueAnalyticsResponse {
    queueId: string;
    queueName: string;
    operationalTokenVolume: number;
    completedTokens: number;
    noShows: number;
    cancellations: number;
    transfers: number;
    completionRate: number;
    noShowRate: number;
    cancellationRate: number;
    currentQueueLoad: number;
}

/** Maps to com.align.qms.analytics.dto.StaffServiceDurationResponse */
export interface StaffServiceDurationResponse {
    staffId: string;
    staffName: string | null;
    completedSegments: number;
    averageServiceDurationSeconds: number | null;
}

// ── Legacy interfaces kept for backward compatibility with Screen12 ─────────

export interface AnalyticsOverviewResponse {
    totalTokensIssued: number;
    tokensCompleted: number;
    tokensNoShow: number;
    tokensCancelled: number;
    tokensExpired: number;
    tokensInProgress: number;
    avgWaitTimeSeconds: number | null;
    avgWaitTimeSampleSize: number;
    avgServiceTimeSeconds: number | null;
    avgServiceTimeSampleSize: number;
    avgJourneyTimeSeconds: number | null;
    avgJourneyTimeSampleSize: number;
    noShowRate: number | null;
    cancellationRate: number | null;
    peakHour: number | null;
    peakHourTokenCount: number | null;
}

export interface LegacyHourlyBucket {
    hour: number;
    tokensJoined: number;
    tokensCompleted: number;
}

export interface LegacyAnalyticsTrafficResponse {
    hourlyBuckets: LegacyHourlyBucket[];
}

export interface LegacyServiceAnalyticsResponse {
    serviceId: string;
    serviceName: string;
    totalTokens: number;
    completed: number;
    noShow: number;
    cancelled: number;
    expired: number;
    currentWaiting: number;
    avgWaitTimeSeconds: number | null;
    avgServiceTimeSeconds: number | null;
    noShowRate: number | null;
    cancellationRate: number | null;
}

// ── Helper ──────────────────────────────────────────────────────────────────

function buildParams(params: Record<string, string | undefined>): URLSearchParams {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') sp.append(k, v);
    });
    return sp;
}

// ── Legacy API functions (used by Screen12OrgDashboard) ─────────────────────

function buildLegacyParams(startDate: string, endDate: string, orgId?: string, locationId?: string, extraParams?: Record<string, string>): URLSearchParams {
    const params = new URLSearchParams();
    params.append('start', startDate);
    params.append('end', endDate);
    if (orgId) params.append('orgId', orgId);
    if (locationId) params.append('locationId', locationId);

    if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => {
            if (v) params.append(k, v);
        });
    }
    return params;
}

// ── Exported API ────────────────────────────────────────────────────────────

export const analyticsApi = {
    // ── Phase 6.8.2 endpoints ───────────────────────────────────────────────

    /** GET /api/v1/analytics/summary */
    getSummary: async (
        orgId: string,
        start: string,
        end: string,
        locationId?: string,
        serviceId?: string,
        queueId?: string,
    ): Promise<AnalyticsSummaryResponse> => {
        const params = buildParams({ orgId, start, end, locationId, serviceId, queueId });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/summary?${params.toString()}`);
        if (!res.ok) throw new Error(`Analytics summary request failed: ${res.status}`);
        return res.json();
    },

    /** GET /api/v1/analytics/staff-service-duration */
    getStaffServiceDuration: async (
        orgId: string,
        start: string,
        end: string,
        locationId?: string,
        staffId?: string,
    ): Promise<StaffServiceDurationResponse[]> => {
        const params = buildParams({ orgId, start, end, locationId, staffId });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/staff-service-duration?${params.toString()}`);
        if (!res.ok) throw new Error(`Staff service duration request failed: ${res.status}`);
        return res.json();
    },

    /** GET /api/v1/analytics/queues */
    getQueues: async (
        orgId: string,
        start: string,
        end: string,
        locationId: string,
    ): Promise<QueueAnalyticsResponse[]> => {
        const params = buildParams({ orgId, start, end, locationId });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/queues?${params.toString()}`);
        if (!res.ok) throw new Error(`Queue analytics request failed: ${res.status}`);
        return res.json();
    },

    // ── Phase 6.8.5 endpoints ───────────────────────────────────────────────

    /** GET /api/v1/analytics/traffic */
    getTrafficPhase685: async (
        orgId: string,
        start: string,
        end: string,
        locationId?: string,
        timezone?: string,
    ): Promise<AnalyticsTrafficResponse> => {
        const params = buildParams({ orgId, start, end, locationId, timezone });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/traffic?${params.toString()}`);
        if (!res.ok) throw new Error(`Traffic analytics request failed: ${res.status}`);
        return res.json();
    },

    /** GET /api/v1/analytics/services */
    getServicesPhase685: async (
        orgId: string,
        start: string,
        end: string,
        locationId?: string,
    ): Promise<ServiceAnalyticsResponse[]> => {
        const params = buildParams({ orgId, start, end, locationId });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/services?${params.toString()}`);
        if (!res.ok) throw new Error(`Service analytics request failed: ${res.status}`);
        return res.json();
    },

    /** GET /api/v1/analytics/counters */
    getCountersPhase685: async (
        orgId: string,
        start: string,
        end: string,
        locationId?: string,
    ): Promise<CounterAnalyticsResponse[]> => {
        const params = buildParams({ orgId, start, end, locationId });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/counters?${params.toString()}`);
        if (!res.ok) throw new Error(`Counter analytics request failed: ${res.status}`);
        return res.json();
    },

    // ── Legacy endpoints (adapted to current backend for Screen12OrgDashboard) ─

    getOverview: async (startDate: string, endDate: string, orgId?: string, locationId?: string): Promise<AnalyticsOverviewResponse> => {
        const params = buildParams({ orgId, start: startDate, end: endDate, locationId });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/summary?${params.toString()}`);
        if (!res.ok) throw new Error(`Overview request failed: ${res.status}`);
        const data: AnalyticsSummaryResponse = await res.json();
        return {
            totalTokensIssued: data.operationalTokenVolume,
            tokensCompleted: data.completedTokens,
            tokensNoShow: data.noShows,
            tokensCancelled: data.cancellations,
            tokensExpired: 0,
            tokensInProgress: data.currentQueueLoad,
            avgWaitTimeSeconds: null,
            avgWaitTimeSampleSize: 0,
            avgServiceTimeSeconds: null,
            avgServiceTimeSampleSize: 0,
            avgJourneyTimeSeconds: null,
            avgJourneyTimeSampleSize: 0,
            noShowRate: data.noShowRate,
            cancellationRate: data.cancellationRate,
            peakHour: null,
            peakHourTokenCount: null,
        };
    },

    getTraffic: async (startDate: string, endDate: string, orgId?: string, locationId?: string): Promise<LegacyAnalyticsTrafficResponse> => {
        const params = buildParams({ orgId, start: startDate, end: endDate, locationId });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/traffic?${params.toString()}`);
        if (!res.ok) throw new Error(`Traffic request failed: ${res.status}`);
        return res.json();
    },

    getServices: async (startDate: string, endDate: string, orgId?: string, locationId?: string): Promise<LegacyServiceAnalyticsResponse[]> => {
        const params = buildParams({ orgId, start: startDate, end: endDate, locationId });
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/services?${params.toString()}`);
        if (!res.ok) throw new Error(`Services request failed: ${res.status}`);
        return res.json();
    },
};
