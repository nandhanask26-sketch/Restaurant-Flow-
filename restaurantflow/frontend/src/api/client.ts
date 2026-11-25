import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Smart API Base URL resolver: adapts to Render Cloud, Custom Domain, or Local Dev
export function getApiBaseUrl(): string {
  // 1. If running as a Native Mobile APK (Capacitor on Android/iOS)
  if (Capacitor.isNativePlatform()) {
    const envUrl = import.meta.env.VITE_API_URL;
    // Only use VITE_API_URL if it is an external/network URL, never localhost on phone
    if (
      envUrl &&
      (envUrl.startsWith('http://') || envUrl.startsWith('https://')) &&
      !envUrl.includes('localhost') &&
      !envUrl.includes('127.0.0.1')
    ) {
      return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
    }
    // Default to the live Render cloud backend
    return 'https://restaurantflow-backend.onrender.com/api';
  }

  // 2. If running in web browser during local development with Vite dev server
  if (typeof window !== 'undefined') {
    if (
      window.location.port === '5173' ||
      window.location.port === '5174'
    ) {
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
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        // Only clear tokens if the backend explicitly returned 401 Unauthorized or 403 Forbidden.
        // If the device is offline, connection timed out, or backend is cold-starting (502/503),
        // keep the stored session so the user is not logged out!
        const status = refreshError.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('rf_access_token');
          localStorage.removeItem('rf_refresh_token');
          localStorage.removeItem('rf_user');
          localStorage.removeItem('rf_restaurant_id');
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
