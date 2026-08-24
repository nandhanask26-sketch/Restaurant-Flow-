import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { apiClient } from '../api/client';
import { SOCKET_EVENTS } from '../../../backend/src/websocket/socketEvents';

export const ManagerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { restaurantId } = useAuthStore();
  const [restaurantStatus, setRestaurantStatus] = useState<boolean>(true);
  const [restaurantName, setRestaurantName] = useState<string>('Spice Garden');

  const { on, off } = useSocket(restaurantId);

  useEffect(() => {
    async function loadStatus() {
      if (!restaurantId) return;
      try {
        const { data } = await apiClient.get(`/restaurants/${restaurantId}/status`);
        setRestaurantStatus(data.data.isOpen);
        setRestaurantName(data.data.name);
      } catch (err) {
        console.error('Failed to load manager restaurant status:', err);
      }
    }
    loadStatus();
  }, [restaurantId]);

  useEffect(() => {
    const handleStatusChange = (payload: { restaurantId: string; isOpen: boolean }) => {
      if (!restaurantId || payload.restaurantId === restaurantId) {
        setRestaurantStatus(payload.isOpen);
      }
    };

    on(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, handleStatusChange);
    return () => {
      off(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, handleStatusChange);
    };
  }, [on, off, restaurantId]);

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col pb-20 lg:pb-0">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        restaurantStatus={restaurantStatus}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:pl-64 p-3.5 sm:p-6 lg:p-8 min-w-0">
          <Outlet
            context={{
              restaurantId,
              restaurantStatus,
              restaurantName,
              setRestaurantStatus,
            }}
          />
        </main>
      </div>

      {/* Native Mobile Bottom App Navigation */}
      <MobileBottomNav />
    </div>
  );
};
