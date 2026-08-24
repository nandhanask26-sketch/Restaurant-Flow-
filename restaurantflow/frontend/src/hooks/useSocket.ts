import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export function useSocket(restaurantId?: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // If customer, join user room
      if (user?.id) {
        socket.emit('join:user', user.id);
      }
      // If restaurant provided or manager, join restaurant room
      if (restaurantId) {
        socket.emit('join:restaurant', restaurantId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, restaurantId, accessToken]);

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return { socket: socketRef.current, on, off };
}
