import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useSocket } from '../hooks/useSocket';
import { apiClient } from '../api/client';
import { SOCKET_EVENTS } from '../../../backend/src/websocket/socketEvents';

export const CustomerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restaurantStatus, setRestaurantStatus] = useState<boolean | undefined>(undefined);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const { on, off } = useSocket(restaurantId);

  // Fetch initial restaurant status
  useEffect(() => {
    async function loadRestaurant() {
      try {
        const { data } = await apiClient.get('/restaurants');
        if (data.data && data.data.length > 0) {
          const rest = data.data[0];
          setRestaurantId(rest.id);
          setRestaurantStatus(rest.isOpen);
        }
      } catch (err) {
        console.error('Failed to load restaurant info', err);
      }
    }
    loadRestaurant();
  }, []);

  // Listen for live status change from Manager
  useEffect(() => {
    const handleStatusChange = (payload: { restaurantId: string; isOpen: boolean }) => {
      setRestaurantStatus(payload.isOpen);
    };

    on(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, handleStatusChange);
    return () => {
      off(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, handleStatusChange);
    };
  }, [on, off]);

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col pb-20 lg:pb-0">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        restaurantStatus={restaurantStatus}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:pl-64 p-3.5 sm:p-6 lg:p-8 min-w-0">
          <Outlet context={{ restaurantStatus, restaurantId }} />
        </main>
      </div>

      {/* Native Mobile Bottom App Navigation */}
      <MobileBottomNav />
    </div>
  );
};
