import axios from 'axios';

// Smart API Base URL resolver: adapts to Render Cloud, Custom Domain, or Local Dev
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customServer = localStorage.getItem('rf_custom_server');
    if (customServer) {
      return `${customServer.replace(/\/$/, '')}/api`;
    }

    // Only local Vite development server proxies /api to localhost:5000
    if (window.location.hostname === 'localhost' && window.location.port === '5173') {
      return '/api';
    }

    // Check if running inside local network IP dev
    if (window.location.hostname === '10.18.101.206' && window.location.port === '5173') {
      return '/api';
    }
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }

  // Always use the complete canonical cloud backend URL
  return 'https://restaurantflow-backend.onrender.com/api';
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token and ensure fresh baseURL
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = localStorage.getItem('rf_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle Token Refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('rf_refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('rf_access_token');
        localStorage.removeItem('rf_refresh_token');
        localStorage.removeItem('rf_user');
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;

        localStorage.setItem('rf_access_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('rf_refresh_token', newRefreshToken);
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('rf_access_token');
        localStorage.removeItem('rf_refresh_token');
        localStorage.removeItem('rf_user');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
