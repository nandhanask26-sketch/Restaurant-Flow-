import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  User, 
  LogOut, 
  Menu as MenuIcon,
  Store,
  ChefHat,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';
import { InstallAppModal } from './InstallAppModal';

interface NavbarProps {
  onToggleSidebar?: () => void;
  restaurantStatus?: boolean;
  restaurantName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, restaurantStatus, restaurantName }) => {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const cartCount = getItemCount();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isManager = user?.role === 'RESTAURANT_MANAGER' || user?.role === 'ADMIN';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 w-full bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 transition-colors z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          )}

          <Link to={isManager ? '/manager/profile' : '/customer/dashboard'} className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                <line x1="6" y1="1" x2="6" y2="4"></line>
                <line x1="10" y1="1" x2="10" y2="4"></line>
                <line x1="14" y1="1" x2="14" y2="4"></line>
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-white truncate max-w-[115px] sm:max-w-xs">
                  {restaurantName || 'RestaurantFlow'}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {isManager ? 'Manager Console' : 'Smart Ordering'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Live Restaurant Status */}
        {restaurantStatus !== undefined && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <Store className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">Kitchen:</span>
            {restaurantStatus ? (
              <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                OPEN
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                CLOSED
              </span>
            )}
          </div>
        )}

        {/* Right Navigation & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile App Install Button */}
          <button
            type="button"
            onClick={() => setShowInstallModal(true)}
            title="Download RestaurantFlow Android APK or Scan QR"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/30 text-xs font-bold transition shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            <span className="hidden sm:inline">📱 Get APK</span>
            <span className="sm:hidden text-[11px] font-black">APK</span>
          </button>

          {/* Dark / Light Mode Toggle Switch */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 transition-all flex items-center justify-center shadow-sm group"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {!isManager && (
            <Link
              to="/customer/cart"
              className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-brand-500 transition flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5 text-brand-500 dark:text-brand-400" />
              <span className="hidden sm:inline text-xs font-semibold">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-lg shadow-brand-500/40 animate-bounce">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
            <Link
              to={isManager ? '/manager/profile' : '/customer/profile'}
              className="flex items-center gap-2 hover:opacity-90 transition group"
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition">
                  {user?.fullName || 'User'}
                </span>
                <span className="text-[10px] sm:text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                  {isManager ? 'Manager' : 'Customer'}
                </span>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : isManager ? (
                  <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500 dark:text-brand-400" />
                )}
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
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
