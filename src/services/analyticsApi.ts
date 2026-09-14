import { apiClient } from './apiClient';

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

export interface HourlyBucket {
    hour: number;
    tokensJoined: number;
    tokensCompleted: number;
}

export interface AnalyticsTrafficResponse {
    hourlyBuckets: HourlyBucket[];
}

export interface QueueAnalyticsResponse {
    queueId: string;
    queueName: string;
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

export interface ServiceAnalyticsResponse {
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

export interface StaffAnalyticsResponse {
    staffId: string;
    staffName: string;
    tokensCompleted: number;
    avgWaitTimeSeconds: number | null;
    avgServiceTimeSeconds: number | null;
    tokensNoShow: number;
}

export interface CounterAnalyticsResponse {
    counterId: string;
    counterNumber: number;
    counterName: string;
    currentAvailability: string;
    tokensCompleted: number;
    avgServiceTimeSeconds: number | null;
}

function buildParams(startDate: string, endDate: string, orgId?: string, locationId?: string, extraParams?: Record<string, string>): URLSearchParams {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    if (orgId) params.append('orgId', orgId);
    if (locationId) params.append('locationId', locationId);
    
    if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => {
            if (v) params.append(k, v);
        });
    }
    return params;
}

export const analyticsApi = {
    getOverview: async (startDate: string, endDate: string, orgId?: string, locationId?: string): Promise<AnalyticsOverviewResponse> => {
        const params = buildParams(startDate, endDate, orgId, locationId);
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/overview?${params.toString()}`);
        return res.json();
    },

    getTraffic: async (startDate: string, endDate: string, orgId?: string, locationId?: string): Promise<AnalyticsTrafficResponse> => {
        const params = buildParams(startDate, endDate, orgId, locationId);
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/traffic?${params.toString()}`);
        return res.json();
    },

    getQueues: async (startDate: string, endDate: string, orgId?: string, locationId?: string, queueId?: string): Promise<QueueAnalyticsResponse[]> => {
        const params = buildParams(startDate, endDate, orgId, locationId, queueId ? { queueId } : undefined);
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/queues?${params.toString()}`);
        return res.json();
    },

    getServices: async (startDate: string, endDate: string, orgId?: string, locationId?: string): Promise<ServiceAnalyticsResponse[]> => {
        const params = buildParams(startDate, endDate, orgId, locationId);
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/services?${params.toString()}`);
        return res.json();
    },

    getStaff: async (startDate: string, endDate: string, orgId?: string, locationId?: string, staffId?: string): Promise<StaffAnalyticsResponse[]> => {
        const params = buildParams(startDate, endDate, orgId, locationId, staffId ? { staffId } : undefined);
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/staff?${params.toString()}`);
        return res.json();
    },

    getCounters: async (startDate: string, endDate: string, orgId?: string, locationId?: string, counterId?: string): Promise<CounterAnalyticsResponse[]> => {
        const params = buildParams(startDate, endDate, orgId, locationId, counterId ? { counterId } : undefined);
        const res = await apiClient.authenticatedFetch(`/api/v1/analytics/counters?${params.toString()}`);
        return res.json();
    }
};
