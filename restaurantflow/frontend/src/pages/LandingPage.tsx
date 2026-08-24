import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  ChefHat, 
  ShoppingBag 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [demoLoading, setDemoLoading] = React.useState<string | null>(null);

  // Quick 1-Click Demo Logins
  const handleQuickDemoLogin = async (role: 'CUSTOMER' | 'MANAGER') => {
    setDemoLoading(role);
    try {
      const email = role === 'MANAGER' ? 'manager@example.com' : 'customer@example.com';
      const password = 'Password123!';

      const { data } = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken, restaurantId } = data.data;

      setAuth(user, accessToken, refreshToken, restaurantId);

      if (role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      console.error('Demo login error:', err);
      navigate(role === 'MANAGER' ? '/manager/login' : '/login');
    } finally {
      setDemoLoading(null);
    }
  };

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
            <span className="text-3xl sm:text-4xl font-bold font-sans tracking-tight text-white flex items-center justify-center gap-1.5">
              Restaurant<span className="text-brand-400">Flow</span>
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-400 block mt-1">
              Smart Restaurant Ordering & Management Platform
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          Effortless Dining. <br />
          <span className="bg-gradient-to-r from-brand-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Intelligent Restaurant Operations.
          </span>
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Connect customers with kitchens in real time. Features scheduled time slots, concurrency-safe inventory deduction, authoritative daily tokens, single-use QR verifications, and live smart queue management.
        </p>

        {/* Clean Login Action Buttons */}
        <div className="max-w-xl mx-auto w-full pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleQuickDemoLogin('CUSTOMER')}
              disabled={demoLoading !== null}
              className="btn-primary text-xs sm:text-sm py-4 font-bold flex items-center justify-center gap-2.5 shadow-glow rounded-2xl"
            >
              <ShoppingBag className="w-4 h-4" />
              {demoLoading === 'CUSTOMER' ? 'Logging in...' : 'Login as Customer'}
            </button>

            <button
              onClick={() => handleQuickDemoLogin('MANAGER')}
              disabled={demoLoading !== null}
              className="btn-secondary text-xs sm:text-sm py-4 font-bold flex items-center justify-center gap-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-slate-700/80 shadow-lg rounded-2xl"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              {demoLoading === 'MANAGER' ? 'Logging in...' : 'Login as Restaurant Manager'}
            </button>
          </div>
        </div>

        {/* Centered Copyright */}
        <div className="pt-4 text-center">
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            © 2026 RestaurantFlow.
          </p>
        </div>
      </main>
    </div>
  );
};
