import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Utensils, ShoppingBag, ListOrdered, User } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { useSocket } from '../hooks/useSocket';
import { apiClient } from '../api/client';
import { SOCKET_EVENTS } from '../types/socketEvents';
import { useCartStore } from '../store/cartStore';

export const CustomerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restaurantStatus, setRestaurantStatus] = useState<boolean | undefined>(undefined);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();

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
    <div className="min-h-screen bg-[#F8F5EE] dark:bg-[#0E1217] text-[#1C1917] dark:text-stone-100 flex flex-col pb-20 lg:pb-8 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        restaurantStatus={restaurantStatus}
        restaurantName={restaurantName}
      />

      <div className="pt-16 w-full">
        {/* Top Horizontal Sub-Navigation Tabs Bar matching screenshot */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-b border-[#E8DFD1] dark:border-stone-800">
            <NavLink
              to="/customer/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all relative whitespace-nowrap ${
                  isActive
                    ? 'text-[#0D5C3A] dark:text-emerald-400 font-extrabold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-[#0D5C3A] dark:after:bg-emerald-400'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/40'
                }`
              }
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </NavLink>

            <NavLink
              to="/customer/menu"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all relative whitespace-nowrap ${
                  isActive
                    ? 'text-[#0D5C3A] dark:text-emerald-400 font-extrabold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-[#0D5C3A] dark:after:bg-emerald-400'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/40'
                }`
              }
            >
              <Utensils className="w-4 h-4" />
              <span>Today's Menu</span>
            </NavLink>

            <NavLink
              to="/customer/cart"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all relative whitespace-nowrap ${
                  isActive
                    ? 'text-[#0D5C3A] dark:text-emerald-400 font-extrabold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-[#0D5C3A] dark:after:bg-emerald-400'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/40'
                }`
              }
            >
              <ShoppingBag className="w-4 h-4" />
              <span>My Cart</span>
              {cartCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#15803D] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/customer/orders"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all relative whitespace-nowrap ${
                  isActive
                    ? 'text-[#0D5C3A] dark:text-emerald-400 font-extrabold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-[#0D5C3A] dark:after:bg-emerald-400'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/40'
                }`
              }
            >
              <ListOrdered className="w-4 h-4" />
              <span>My Orders</span>
            </NavLink>

            <NavLink
              to="/customer/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all relative whitespace-nowrap ${
                  isActive
                    ? 'text-[#0D5C3A] dark:text-emerald-400 font-extrabold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-[#0D5C3A] dark:after:bg-emerald-400'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/40'
                }`
              }
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </NavLink>
          </div>
        </div>

        {/* Mobile Slide-in Drawer (only when hamburger is clicked on mobile) */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Viewport */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 min-w-0 overflow-x-hidden">
          <Outlet context={{ restaurantStatus, restaurantId, restaurantName }} />
        </main>
      </div>

      {/* Native Mobile Bottom App Navigation */}
      <MobileBottomNav />
    </div>
  );
};
