import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Clock, 
  ListOrdered, 
  ScanLine, 
  Boxes, 
  Store, 
  Utensils, 
  ShoppingBag, 
  UserCheck 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

interface NavLinkItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuthStore();
  const cartItemCount = useCartStore((state) => state.getItemCount());
  const isManager = user?.role === 'RESTAURANT_MANAGER' || user?.role === 'ADMIN';

  const managerLinks: NavLinkItem[] = [
    { to: '/manager/profile', icon: Store, label: 'Profile' },
    { to: '/manager/qr-scanner', icon: ScanLine, label: 'Scan & Queue' },
    { to: '/manager/orders', icon: ListOrdered, label: 'Orders' },
    { to: '/manager/menu', icon: Utensils, label: 'Menu' },
    { to: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  const customerLinks: NavLinkItem[] = [
    { to: '/customer/dashboard', icon: Store, label: 'Home' },
    { to: '/customer/menu', icon: Utensils, label: 'Menu' },
    { to: '/customer/cart', icon: ShoppingBag, label: 'Cart', badge: cartItemCount },
    { to: '/customer/orders', icon: ListOrdered, label: 'Orders' },
    { to: '/customer/profile', icon: UserCheck, label: 'Profile' },
  ];

  const links = isManager ? managerLinks : customerLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#FBF7EE]/95 dark:bg-[#151921]/95 backdrop-blur-xl border-t border-[#E8DFD1] dark:border-stone-800 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] shadow-lg">
      <div className="grid grid-flow-col auto-cols-fr items-center gap-1 max-w-lg mx-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 relative ${
                  isActive
                    ? 'text-[#0D5C3A] dark:text-emerald-400 bg-[#0D5C3A]/10 font-bold scale-105'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 font-medium'
                }`
              }
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {Boolean(link.badge && link.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 bg-[#EA580C] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {link.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate">
                {link.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
