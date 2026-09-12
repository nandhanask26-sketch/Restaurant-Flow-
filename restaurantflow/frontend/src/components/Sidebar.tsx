import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ListOrdered, 
  ScanLine, 
  Utensils, 
  Boxes, 
  BarChart3, 
  Clock, 
  ShoppingBag,
  Sparkles,
  Store,
  UserCheck
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const isManager = user?.role === 'RESTAURANT_MANAGER';

  const managerNav: NavItem[] = [
    { to: '/manager/profile', icon: Store, label: 'Restaurant Profile' },
    { to: '/manager/qr-scanner', icon: ScanLine, label: 'Scan & Verify QR' },
    { to: '/manager/orders', icon: ListOrdered, label: 'All Orders' },
    { to: '/manager/menu', icon: Utensils, label: 'Menu & Schedules' },
    { to: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/manager/analytics', icon: BarChart3, label: 'Live Analytics & Revenue Performance' },
  ];

  const customerNav: NavItem[] = [
    { to: '/customer/dashboard', icon: Store, label: 'Home' },
    { to: '/customer/menu', icon: Utensils, label: 'Today’s Menu', highlight: true },
    { to: '/customer/cart', icon: ShoppingBag, label: 'My Cart' },
    { to: '/customer/orders', icon: ListOrdered, label: 'My Orders' },
    { to: '/customer/profile', icon: UserCheck, label: 'Profile' },
  ];

  const links = isManager ? managerNav : customerNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0 shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col justify-between p-4 overflow-y-auto">
          <div className="space-y-1.5">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isManager ? 'Management Hub' : 'Ordering Menu'}
            </div>

            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30 font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.highlight && (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};
