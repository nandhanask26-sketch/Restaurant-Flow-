import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  User, 
  LogOut, 
  ChefHat,
  Sun,
  Moon,
  Smartphone,
  ChevronDown,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';
import { InstallAppModal } from './InstallAppModal';

interface NavbarProps {
  restaurantStatus?: boolean;
  restaurantName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ restaurantStatus, restaurantName }) => {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const cartCount = getItemCount();

  const isManager = user?.role === 'RESTAURANT_MANAGER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const logoInitial = restaurantName ? restaurantName.trim().charAt(0).toUpperCase() : (isManager ? 'N' : 'R');
  const userInitial = user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U';

  const handleLogout = () => {
    const wasManager = isManager;
    logout();
    if (wasManager) {
      navigate('/manager/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-[#FBF7EE] dark:bg-[#151921] border-b border-[#E8DFD1] dark:border-slate-800 transition-colors z-40 shadow-xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link to={isManager ? '/manager/dashboard' : '/customer/dashboard'} className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            {/* Green Rounded Square Logo with White Letter */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0D5C3A] text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
              <span>{logoInitial}</span>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="font-sans font-extrabold text-sm sm:text-lg tracking-tight text-[#1C1917] dark:text-white truncate max-w-[130px] xs:max-w-[170px] sm:max-w-xs">
                {restaurantName || (isManager ? "Nalan's Mess" : 'RestaurantFlow')}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-stone-500 dark:text-emerald-400 truncate">
                  {isManager ? 'Manager Console' : 'SMART ORDERING'}
                </span>
                {restaurantStatus !== undefined && (
                  <span className={`sm:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${
                    restaurantStatus
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${restaurantStatus ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    {restaurantStatus ? 'Open' : 'Closed'}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Live Kitchen Status Pill (Desktop & Tablet) */}
        {restaurantStatus !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EE] dark:bg-emerald-950/40 border border-[#B7E4C7] dark:border-emerald-800/60 text-xs shadow-2xs flex-shrink-0">
            <span className="text-stone-700 dark:text-emerald-300 font-medium text-[11px] sm:text-xs">Kitchen:</span>
            {restaurantStatus ? (
              <span className="flex items-center gap-1.5 text-[#15803D] dark:text-emerald-400 font-bold text-[11px] sm:text-xs">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
                OPEN
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] sm:text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                CLOSED
              </span>
            )}
          </div>
        )}

        {/* Right Navigation & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Mobile App Download Button: Customer Desktop/Tablet Only (mobile uses bottom nav & prompt) */}
          {!isManager && (
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              title="Download RestaurantFlow Android APK or Web App"
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-[#F5EFE6] dark:hover:bg-slate-800 text-stone-800 dark:text-stone-200 border border-[#DDD0C0] dark:border-slate-700 text-xs font-bold transition shadow-2xs flex-shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span>Get App</span>
            </button>
          )}

          {/* Theme Toggle (Dark / Light Mode) - ALWAYS VISIBLE */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-slate-900 border border-[#DDD0C0] dark:border-slate-700 hover:border-amber-400/80 text-stone-700 dark:text-amber-400 transition flex items-center justify-center shadow-2xs flex-shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-stone-700 dark:text-stone-200 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Notification Bell for Manager */}
          {isManager && (
            <button
              type="button"
              title="Notifications"
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-slate-900 border border-[#DDD0C0] dark:border-slate-700 hover:border-stone-400 text-stone-700 dark:text-slate-300 transition flex items-center justify-center shadow-2xs flex-shrink-0"
            >
              <Bell className="w-4 h-4 text-stone-600 dark:text-slate-300" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EA580C] text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                3
              </span>
            </button>
          )}

          {/* Cart Icon for Customer (Desktop Only - on phones customer uses bottom nav) */}
          {!isManager && (
            <Link
              to="/customer/cart"
              className="hidden sm:flex relative p-2 rounded-xl bg-white dark:bg-slate-900 border border-[#DDD0C0] dark:border-slate-700 text-stone-800 dark:text-stone-200 hover:text-emerald-700 transition items-center shadow-2xs flex-shrink-0"
            >
              <ShoppingBag className="w-5 h-5 text-[#292524] dark:text-stone-200" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#EA580C] text-white rounded-full text-xs font-bold flex items-center justify-center shadow-sm animate-bounce">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Profile User Dropdown */}
          <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-[#E8DFD1] dark:border-slate-800 flex-shrink-0">
            <Link
              to={isManager ? '/manager/profile' : '/customer/profile'}
              className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0D5C3A] text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{isManager ? (user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'R') : userInitial}</span>
                )}
              </div>

              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-[#1C1917] dark:text-stone-100 truncate max-w-[120px]">
                  {user?.fullName || (isManager ? 'Rajesh Kumar' : 'Customer')}
                </span>
                <span className="text-[10px] text-[#78716C] dark:text-slate-400 font-medium">
                  {isManager ? 'Manager' : 'Customer'}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-[#78716C] dark:text-slate-400 hidden lg:inline" />
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-xl text-stone-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile App Install & QR Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        restaurantName={restaurantName}
      />
    </header>
  );
};
