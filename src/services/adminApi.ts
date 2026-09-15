import { apiClient } from './apiClient';
import { Tenant, LocationBranch, ServiceItem, QueueItem } from '../types';

const API_BASE = '/api/v1';

export const adminApi = {
  // ── Tenants ──────────────────────────────────────────────────────────────
  getTenants: async (): Promise<Tenant[]> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/tenants`);
    if (!res.ok) throw new Error('Failed to fetch tenants');
    return res.json();
  },
  createTenant: async (data: Partial<Tenant>): Promise<Tenant> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create tenant');
    return res.json();
  },
  updateTenantStatus: async (orgId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<Tenant> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/tenants/${orgId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update tenant status');
    return res.json();
  },

  // ── Locations ────────────────────────────────────────────────────────────
  getLocations: async (): Promise<LocationBranch[]> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/locations`);
    if (!res.ok) throw new Error('Failed to fetch locations');
    return res.json();
  },
  createLocation: async (data: Partial<LocationBranch>): Promise<LocationBranch> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create location');
    return res.json();
  },
  updateLocation: async (id: string, data: Partial<LocationBranch>): Promise<LocationBranch> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update location');
    return res.json();
  },
  updateLocationStatus: async (id: string, status: string): Promise<LocationBranch> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/locations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update location status');
    return res.json();
  },

  // ── Services ─────────────────────────────────────────────────────────────
  getServices: async (locationId: string): Promise<ServiceItem[]> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/services?locationId=${locationId}`);
    if (!res.ok) throw new Error('Failed to fetch services');
    return res.json();
  },
  createService: async (data: Partial<ServiceItem>): Promise<ServiceItem> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create service');
    return res.json();
  },
  updateService: async (id: string, data: Partial<ServiceItem>): Promise<ServiceItem> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update service');
    return res.json();
  },
  updateServiceStatus: async (id: string, enabled: boolean): Promise<ServiceItem> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/services/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: enabled ? 'ACTIVE' : 'INACTIVE' }),
    });
    if (!res.ok) throw new Error('Failed to update service status');
    return res.json();
  },

  // ── Queues ───────────────────────────────────────────────────────────────
  getQueuesByLocation: async (locationId: string): Promise<QueueItem[]> => {
    // Assuming backend endpoint exists for getting queues by location or just queues.
    // I saw /api/v1/queues doesn't seem to have a base list without location if the design strictly follows.
    // The previous implementation used getQueues or something. Let me fetch from location if backend supports it.
    // The instructions mentioned checking if backend contracts exist. For Gate 3: GET /api/v1/locations/{locationId}/queues maybe? Wait, QueueController only had GET /api/v1/queues/{queueId}.
    // Actually, QueueService has `listByLocation(UUID locationId)` but is it exposed via API?
    // Let me check LocationSnapshotController or QueueController.
    // Just in case, I'll put a generic fetch here, but might need to adjust.
    const res = await apiClient.authenticatedFetch(`${API_BASE}/locations/${locationId}/queues`);
    if (!res.ok) throw new Error('Failed to fetch queues');
    return res.json();
  },
  getQueue: async (id: string): Promise<QueueItem> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/queues/${id}`);
    if (!res.ok) throw new Error('Failed to fetch queue');
    return res.json();
  },
  createQueue: async (data: Partial<QueueItem>): Promise<QueueItem> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/queues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create queue');
    return res.json();
  },
  updateQueueStatus: async (id: string, status: string): Promise<QueueItem> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/queues/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update queue status');
    return res.json();
  },
  updateQueueConfig: async (id: string, config: { maxCapacity?: number, autoPauseAtCapacity?: boolean, tokenPrefix?: string }): Promise<QueueItem> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/queues/${id}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update queue config');
    return res.json();
  },
};
