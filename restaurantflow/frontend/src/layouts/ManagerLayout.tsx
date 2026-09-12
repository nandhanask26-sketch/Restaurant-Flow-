import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { apiClient } from '../api/client';
import { SOCKET_EVENTS } from '../types/socketEvents';

export const ManagerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { restaurantId } = useAuthStore();
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(restaurantId || null);
  const [restaurantStatus, setRestaurantStatus] = useState<boolean>(true);
  const [restaurantName, setRestaurantName] = useState<string>('');

  const { on, off } = useSocket(activeRestaurantId || restaurantId);

  useEffect(() => {
    let isMounted = true;
    async function loadStatus() {
      try {
        let targetId = restaurantId || activeRestaurantId;
        if (!targetId) {
          const res = await apiClient.get('/restaurants');
          if (res.data?.data?.length > 0) {
            targetId = res.data.data[0].id;
            if (isMounted) setActiveRestaurantId(targetId);
          }
        }
        if (targetId) {
          const { data } = await apiClient.get(`/restaurants/${targetId}`);
          if (isMounted && data.data) {
            setRestaurantStatus(data.data.isOpen ?? true);
            setRestaurantName(data.data.name || '');
          }
        }
      } catch (err) {
        console.error('Failed to load manager restaurant status:', err);
      }
    }
    loadStatus();

    return () => {
      isMounted = false;
    };
  }, [restaurantId, activeRestaurantId]);

  useEffect(() => {
    const handleStatusChange = (payload: { restaurantId: string; isOpen: boolean }) => {
      const currentId = activeRestaurantId || restaurantId;
      if (!currentId || payload.restaurantId === currentId) {
        setRestaurantStatus(payload.isOpen);
      }
    };

    const handleRestaurantUpdate = (updated: any) => {
      const currentId = activeRestaurantId || restaurantId;
      if (!currentId || updated.id === currentId) {
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
  }, [on, off, restaurantId, activeRestaurantId]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col pb-20 lg:pb-0 transition-colors duration-200">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        restaurantStatus={restaurantStatus}
        restaurantName={restaurantName}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pt-16">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 lg:pl-64 p-3.5 sm:p-6 lg:p-8 min-w-0">
          <Outlet
            context={{
              restaurantId: activeRestaurantId || restaurantId,
              restaurantStatus,
              restaurantName,
              setRestaurantStatus,
              setRestaurantName,
            }}
          />
        </main>
      </div>

      {/* Native Mobile Bottom App Navigation */}
      <MobileBottomNav />
    </div>
  );
};
