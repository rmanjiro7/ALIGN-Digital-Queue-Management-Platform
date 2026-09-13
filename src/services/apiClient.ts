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
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          apiClient.clearSession();
          return false;
        }
        const data: RefreshResponse = await res.json();
        apiClient.setTokens(data.accessToken, data.refreshToken);
        return true;
      })
      .catch(() => {
        apiClient.clearSession();
        return false;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });

    return refreshPromise;
  },

  authenticatedFetch: async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!memoryAccessToken) {
      const refreshed = await apiClient.refresh();
      if (!refreshed) {
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

    if (response.status === 401) {
      // Token might be expired, try refreshing once
      const refreshed = await apiClient.refresh();
      if (refreshed) {
        response = await makeRequest();
      } else {
        throw new Error('UNAUTHENTICATED');
      }
    }

    return response;
  }
};
