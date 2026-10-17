export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  orgId: string | null;
  locationId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponse;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const API_BASE = '/api/v1';
let memoryAccessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export const apiClient = {
  getAccessToken: () => memoryAccessToken,

  getRefreshToken: () => sessionStorage.getItem('refreshToken'),

  setTokens: (accessToken: string, refreshToken: string) => {
    memoryAccessToken = accessToken;
    sessionStorage.setItem('refreshToken', refreshToken);
  },

  clearSession: () => {
    memoryAccessToken = null;
    sessionStorage.removeItem('refreshToken');
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data: LoginResponse = await response.json();
    apiClient.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      if (memoryAccessToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${memoryAccessToken}`,
          },
        });
      }
    } catch (e) {
      // Ignore logout errors
    } finally {
      apiClient.clearSession();
    }
  },

  refresh: async (): Promise<boolean> => {
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    const refreshToken = apiClient.getRefreshToken();
    if (!refreshToken) {
      apiClient.clearSession();
      return false;
    }

    isRefreshing = true;
    console.log('[DEBUG] apiClient.refresh: Sending POST /api/v1/auth/refresh');
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        console.log('[DEBUG] apiClient.refresh: Response status', res.status);
        if (!res.ok) {
          console.error('[DEBUG] apiClient.refresh: Refresh failed, clearing session');
          apiClient.clearSession();
          return false;
        }
        const data: RefreshResponse = await res.json();
        console.log('[DEBUG] apiClient.refresh: Success, setting tokens');
        apiClient.setTokens(data.accessToken, data.refreshToken);
        return true;
      })
      .catch((err) => {
        console.error('[DEBUG] apiClient.refresh: Fetch error', err);
        apiClient.clearSession();
        return false;
      })
      .finally(() => {
        console.log('[DEBUG] apiClient.refresh: Finally block, clearing locks');
        isRefreshing = false;
        refreshPromise = null;
      });

    return refreshPromise;
  },

  authenticatedFetch: async (url: string, options: RequestInit = {}): Promise<Response> => {
    console.log(`[DEBUG] authenticatedFetch: Starting request to ${url}`);
    if (!memoryAccessToken) {
      console.log(`[DEBUG] authenticatedFetch: No memory token for ${url}, calling refresh`);
      const refreshed = await apiClient.refresh();
      if (!refreshed) {
        console.error(`[DEBUG] authenticatedFetch: Refresh failed for ${url}, throwing UNAUTHENTICATED`);
        throw new Error('UNAUTHENTICATED');
      }
    }

    const makeRequest = () => {
      const headers = new Headers(options.headers || {});
      if (memoryAccessToken) {
        headers.set('Authorization', `Bearer ${memoryAccessToken}`);
      }
      return fetch(url, { ...options, headers });
    };

    let response = await makeRequest();
    console.log(`[DEBUG] authenticatedFetch: Initial response for ${url} is`, response.status);

    if (response.status === 401) {
      console.warn(`[DEBUG] authenticatedFetch: 401 received for ${url}, attempting refresh`);
      // Token might be expired, try refreshing once
      const refreshed = await apiClient.refresh();
      if (refreshed) {
        console.log(`[DEBUG] authenticatedFetch: Refresh succeeded, retrying ${url}`);
        response = await makeRequest();
        console.log(`[DEBUG] authenticatedFetch: Retry response for ${url} is`, response.status);
      } else {
        console.error(`[DEBUG] authenticatedFetch: Retry refresh failed for ${url}, throwing UNAUTHENTICATED`);
        throw new Error('UNAUTHENTICATED');
      }
    }

    return response;
  },

  callNextToken: async (_orgId: string, _locationId: string, _queueId: string, counterId: string): Promise<any> => {
    const res = await apiClient.authenticatedFetch(`/api/v1/staff/counters/${counterId}/call-next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error('Failed to call next token');
    }

    return res.json();
  },

  getQueueWarnings: async (locationId: string): Promise<any[]> => {
    const res = await apiClient.authenticatedFetch(`/api/v1/locations/${locationId}/queue-warnings`, {
      method: 'GET'
    });

    if (!res.ok) {
      throw new Error('Failed to fetch queue warnings');
    }

    return res.json();
  },

  getServices: async (locationId: string): Promise<any[]> => {
    const res = await fetch(`/api/v1/services?locationId=${encodeURIComponent(locationId)}`, {
      method: 'GET'
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch services: ${res.status}`);
    }
    return res.json();
  },

  getPreparationRequirements: async (serviceId: string): Promise<any[]> => {
    const res = await fetch(`/api/v1/services/${serviceId}/preparation-requirements`, {
      method: 'GET'
    });
    if (!res.ok) {
      throw new Error('Failed to fetch preparation requirements');
    }
    return res.json();
  },

  getTokenPosition: async (tokenId: string): Promise<any> => {
    const res = await fetch(`/api/v1/tokens/${tokenId}/position`, {
      method: 'GET'
    });
    if (!res.ok) {
      throw new Error('Failed to fetch token position');
    }
    return res.json();
  },

  joinQueue: async (orgId: string, locationId: string, serviceId: string, customerName?: string, customerPhone?: string, smsConsent?: boolean): Promise<any> => {
    const res = await fetch(`/api/v1/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orgId,
        locationId,
        serviceId,
        customerName,
        customerPhone,
        smsConsent
      })
    });

    if (!res.ok) {
      let detail = `Failed to join queue (HTTP ${res.status})`;
      try {
        const body = await res.json();
        if (body?.message) {
          detail = body.message;
        } else if (body?.code) {
          detail = `${body.code}: Failed to join queue`;
        }
      } catch (_) {}
      const err: any = new Error(detail);
      err.status = res.status;
      throw err;
    }

    return res.json();
  },

  transferToken: async (tokenId: string, targetServiceId: string): Promise<any> => {
    const res = await apiClient.authenticatedFetch(`/api/v1/tokens/${tokenId}/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetServiceId })
    });

    if (!res.ok) {
      throw new Error('Failed to transfer token');
    }

    return res.json();
  },

  transferRecovery: async (tokenId: string, realtimeToken: string): Promise<any> => {
    const res = await fetch(`/api/v1/tokens/${tokenId}/transfer-recovery`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${realtimeToken}`
      }
    });

    if (!res.ok) {
      throw new Error('Failed to recover transferred token');
    }

    return res.json();
  },

  completeToken: async (tokenId: string, counterId: string): Promise<any> => {
    return apiClient.authenticatedFetch(`${API_BASE}/staff/tokens/${tokenId}/complete?counterId=${counterId}`, {
      method: 'POST'
    });
  },

  createAnnouncement: async (payload: { locationId: string, text: string, tokenId?: string, tokenNumber?: string, counterId?: string, counterNumber?: number }): Promise<any> => {
    const res = await apiClient.authenticatedFetch(`${API_BASE}/staff/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error('Failed to create announcement');
    }
    return res.json();
  }
};

if (typeof window !== 'undefined') {
  (window as any).apiClient = apiClient;
}
