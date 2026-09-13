import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export function getSocketUrl(): string {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    const customServer = localStorage.getItem('rf_custom_server');
    if (customServer) {
      return customServer.replace(/\/$/, '');
    }

    const isCapacitor = 
      !!(window as any).Capacitor?.isNativePlatform?.() || 
      (window as any).Capacitor?.platform === 'android' ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && window.location.port === '');

    if (isCapacitor) {
      return 'https://restaurantflow-backend.onrender.com';
    }

    const hostname = window.location.hostname;
    if (hostname.includes('restaurantflow-frontend.onrender.com')) {
      return 'https://restaurantflow-backend.onrender.com';
    }
    if (hostname.includes('onrender.com')) {
      const backendHost = hostname.replace('-frontend', '-backend');
      return `https://${backendHost}`;
    }
    return window.location.origin;
  }
  return '';
}

export function useSocket(restaurantId?: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { user, accessToken } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // If customer, join user room
      if (user?.id) {
        socket.emit('join:user', user.id);
      }
      // If restaurant provided or manager, join restaurant room
      if (restaurantId) {
        socket.emit('join:restaurant', restaurantId);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, user?.id, accessToken]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    socketRef.current?.off(event, callback);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off,
  };
}
