import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  User, 
  LogOut, 
  Menu as MenuIcon,
  Store,
  ChefHat
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

interface NavbarProps {
  onToggleSidebar?: () => void;
  restaurantStatus?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, restaurantStatus }) => {
  const { user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const cartCount = getItemCount();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isManager = user?.role === 'RESTAURANT_MANAGER' || user?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          )}

          <Link to={isManager ? '/manager/dashboard' : '/customer/dashboard'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-bold font-sans tracking-tight text-white flex items-center gap-1.5">
                Restaurant<span className="text-brand-400">Flow</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-semibold tracking-wider text-slate-400 -mt-1">
                {isManager ? 'Manager Console' : 'Smart Ordering'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Live Restaurant Status */}
        {restaurantStatus !== undefined && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Status:</span>
            {restaurantStatus ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                OPEN
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                CLOSED
              </span>
            )}
          </div>
        )}

        {/* Right Navigation & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isManager && (
            <Link
              to="/customer/cart"
              className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5 text-brand-400" />
              <span className="hidden sm:inline text-xs font-semibold">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-lg shadow-brand-500/40 animate-bounce">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-800">
            <Link
              to={isManager ? '/manager/dashboard' : '/customer/profile'}
              className="flex items-center gap-2 hover:opacity-90 transition group"
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-brand-400 transition">
                  {user?.fullName || 'User'}
                </span>
                <span className="text-[10px] sm:text-[11px] text-brand-400 font-medium">
                  {isManager ? 'Manager' : 'Customer'}
                </span>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-300">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : isManager ? (
                  <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-brand-400" />
                )}
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
