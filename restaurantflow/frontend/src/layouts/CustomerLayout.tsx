import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useSocket } from '../hooks/useSocket';
import { apiClient } from '../api/client';
import { SOCKET_EVENTS } from '../types/socketEvents';

export const CustomerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restaurantStatus, setRestaurantStatus] = useState<boolean | undefined>(undefined);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const { on, off } = useSocket(restaurantId);

  // Fetch initial restaurant status and name from database
  useEffect(() => {
    async function loadRestaurant() {
      try {
        const { data } = await apiClient.get('/restaurants');
        if (data.data && data.data.length > 0) {
          const rest = data.data[0];
          setRestaurantId(rest.id);
          setRestaurantStatus(rest.isOpen);
          setRestaurantName(rest.name || '');
        }
      } catch (err) {
        console.error('Failed to load restaurant info', err);
      }
    }
    loadRestaurant();
  }, []);

  // Listen for live status change and profile updates from Manager
  useEffect(() => {
    const handleStatusChange = (payload: { restaurantId: string; isOpen: boolean }) => {
      if (!restaurantId || payload.restaurantId === restaurantId) {
        setRestaurantStatus(payload.isOpen);
      }
    };

    const handleRestaurantUpdate = (updated: any) => {
      if (!restaurantId || updated.id === restaurantId) {
        if (updated.name) setRestaurantName(updated.name);
        if (updated.isOpen !== undefined) setRestaurantStatus(updated.isOpen);
      }
    };

    on(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, handleStatusChange);
    on(SOCKET_EVENTS.RESTAURANT_UPDATED, handleRestaurantUpdate);

    return () => {
      off(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, handleStatusChange);
      off(SOCKET_EVENTS.RESTAURANT_UPDATED, handleRestaurantUpdate);
    };
  }, [on, off, restaurantId]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col pb-20 lg:pb-0 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        restaurantStatus={restaurantStatus}
        restaurantName={restaurantName}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pt-16 overflow-x-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:pl-64 p-2.5 sm:p-6 lg:p-8 min-w-0 w-full max-w-full overflow-x-hidden">
          <Outlet context={{ restaurantStatus, restaurantId, restaurantName }} />
        </main>
      </div>

      {/* Native Mobile Bottom App Navigation */}
      <MobileBottomNav />
    </div>
  );
};
