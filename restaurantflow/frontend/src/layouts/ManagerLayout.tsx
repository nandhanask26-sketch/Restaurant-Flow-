import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Home, 
  Store, 
  ScanLine, 
  ListOrdered, 
  Utensils, 
  BarChart3 
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { apiClient } from '../api/client';
import { SOCKET_EVENTS } from '../types/socketEvents';

const managerTabs = [
  { to: '/manager/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/manager/profile', icon: Store, label: 'Restaurant Profile' },
  { to: '/manager/qr-scanner', icon: ScanLine, label: 'Scan & Verify QR' },
  { to: '/manager/orders', icon: ListOrdered, label: 'All Orders' },
  { to: '/manager/menu', icon: Utensils, label: 'Menu & Schedules' },
  { to: '/manager/analytics', icon: BarChart3, label: 'Live Analytics & Revenue Performance' },
];

export const ManagerLayout: React.FC = () => {
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
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0E1217] text-[#1C1917] dark:text-stone-100 flex flex-col pb-20 lg:pb-0 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      <Navbar
        restaurantStatus={restaurantStatus}
        restaurantName={restaurantName}
      />

      {/* Horizontal Sub-Navigation Tab Bar for Manager (Shown on desktop/tablet, hidden on mobile) */}
      <div className="hidden lg:block w-full bg-[#FAF8F5] dark:bg-[#151921] border-b border-[#EBE6DD] dark:border-stone-800 fixed top-16 left-0 right-0 z-30 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth">
            {managerTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-[1px] ${
                      isActive
                        ? 'border-[#0D5C3A] text-[#0D5C3A] dark:text-emerald-400 dark:border-emerald-400 font-bold'
                        : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl w-full mx-auto pt-16 lg:pt-28">
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 min-w-0">
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
