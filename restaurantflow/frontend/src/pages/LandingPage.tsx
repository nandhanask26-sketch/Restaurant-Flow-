import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  ChefHat, 
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      const isManager =
        user.role === 'RESTAURANT_MANAGER' ||
        user.role === 'MANAGER' ||
        user.role === 'ADMIN';
      navigate(isManager ? '/manager/dashboard' : '/customer/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && user) {
    return null;
  }
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Background Subtle Gradient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Centered Content Container */}
      <main className="max-w-3xl w-full mx-auto text-center space-y-7 relative z-10 py-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-xl shadow-brand-500/25">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>Restaurant</span>
              <span className="text-brand-400">Flow</span>
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 mt-1 inline-block">
              Smart Order & Cafeteria System
            </span>
          </div>
        </div>

        {/* Hero Title & Value Proposition */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Effortless Dining.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-emerald-400 to-teal-300">
              Intelligent Restaurant Operations.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
            Connect customers with kitchens in real time. Features scheduled time slots, concurrency-safe inventory deduction, authoritative daily tokens, single-use QR verifications, and live smart queue management.
          </p>
        </div>

        {/* Primary Role Access Action Cards */}
        <div className="max-w-xl mx-auto w-full pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Link
              to="/login"
              className="btn-primary text-xs sm:text-sm py-4 font-bold flex items-center justify-center gap-2.5 shadow-xl shadow-brand-500/20 rounded-2xl group transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Login as Customer</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/manager/login"
              className="btn-secondary text-xs sm:text-sm py-4 font-bold flex items-center justify-center gap-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-slate-700/80 shadow-lg rounded-2xl group transition-all"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>Login as Restaurant Manager</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Centered Copyright */}
        <div className="pt-6 text-center">
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            © 2026 RestaurantFlow.
          </p>
        </div>
      </main>
    </div>
  );
};
