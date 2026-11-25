import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { AppRoutes } from './routes/AppRoutes';
import { apiClient } from './api/client';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export const App: React.FC = () => {
  const { setAuth } = useAuthStore();

  useEffect(() => {
    // Configure native status bar on Android/iOS so webview never overlaps
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#151921' }).catch(() => {});
      } catch (err) {
        console.warn('StatusBar configuration note:', err);
      }

      // Listen for Native Deep Links (e.g. restaurantflow://auth/callback?token=... or App Links)
      const sub = CapApp.addListener('appUrlOpen', async (data) => {
        try {
          await Browser.close().catch(() => {});
          const rawUrl = data.url;
          // Parse url query or hash
          let queryOrHash = '';
          if (rawUrl.includes('?')) {
            queryOrHash = rawUrl.substring(rawUrl.indexOf('?') + 1);
          } else if (rawUrl.includes('#')) {
            queryOrHash = rawUrl.substring(rawUrl.indexOf('#') + 1);
          }

          const params = new URLSearchParams(queryOrHash);
          const token = params.get('token') || params.get('accessToken') || params.get('access_token') || params.get('credential');
          const refreshToken = params.get('refreshToken') || params.get('refresh_token');

          if (token) {
            // If it's already a backend JWT token, verify or load me
            try {
              localStorage.setItem('rf_access_token', token);
              if (refreshToken) localStorage.setItem('rf_refresh_token', refreshToken);
              const meRes = await apiClient.get('/auth/me');
              const user = meRes.data.data.user;
              setAuth(user, token, refreshToken || token);
              window.location.href = '/customer/dashboard';
            } catch {
              // Alternatively if token is a Google credential/access_token, verify via /auth/google
              const { data: authData } = await apiClient.post('/auth/google', { credential: token });
              const { user, accessToken: newAcc, refreshToken: newRef } = authData.data;
              setAuth(user, newAcc, newRef);
              window.location.href = '/customer/dashboard';
            }
          }
        } catch (e) {
          console.error('Deep link processing error:', e);
        }
      });

      return () => {
        sub.then((h) => h.remove()).catch(() => {});
      };
    }
  }, [setAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};
