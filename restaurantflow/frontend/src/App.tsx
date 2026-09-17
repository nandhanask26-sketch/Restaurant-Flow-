import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AppRoutes } from './routes/AppRoutes';

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
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};
