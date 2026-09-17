import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChefHat, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff,
  ShieldCheck,
  RefreshCw 
} from 'lucide-react';
import { apiClient, getApiBaseUrl } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const ManagerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginElapsed, setLoginElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { isAuthenticated, user, setAuth } = useAuthStore();

  useEffect(() => {
    // Purge any legacy local IP override so user is always on high-speed Cloud
    localStorage.removeItem('rf_custom_server');

    if (isAuthenticated && user) {
      const isManager =
        user.role === 'RESTAURANT_MANAGER' ||
        user.role === 'MANAGER' ||
        user.role === 'ADMIN';
      navigate(isManager ? '/manager/dashboard' : '/customer/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoginElapsed(0);
      interval = setInterval(() => {
        setLoginElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setLoginElapsed(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password;

    try {
      const response = await apiClient.post('/auth/login', { 
        email: cleanEmail, 
        password: cleanPassword 
      });

      // Handle nested { user: {...}, accessToken } and flat { id, email, role, token } formats
      const payload = response.data?.data || response.data;
      const user = payload?.user || (payload?.id || payload?.email ? payload : null);
      const accessToken = payload?.accessToken || payload?.token || '';
      const refreshToken = payload?.refreshToken || payload?.token || '';
      const restaurantId = payload?.restaurantId || user?.restaurantId || null;

      if (!user) {
        throw new Error('User profile data missing in server response.');
      }

      const role = String(user.role || '').toUpperCase();
      if (role !== 'RESTAURANT_MANAGER' && role !== 'MANAGER' && role !== 'ADMIN') {
        setError('This portal is strictly for authorized restaurant managers.');
        return;
      }

      setAuth(user, accessToken, refreshToken, restaurantId);
      navigate('/manager/dashboard');
    } catch (err: any) {
      console.error('Manager login failed:', err);
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('The cloud server was sleeping and timed out waking up. Please tap "Sign In as Manager" again now!');
      } else {
        const netMsg = err.message || (err.code ? `Error: ${err.code}` : 'Network Error');
        setError(`Unable to reach cloud server (${netMsg}). Target: ${getApiBaseUrl()}`);
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 bg-slate-900/90 border-slate-800 rounded-3xl shadow-2xl">
        {/* Back Navigation Button */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-700/50 hover:border-slate-600 transition-all group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>
        </div>
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <ChefHat className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Restaurant<span className="text-amber-400">Flow</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
            <span>Restaurant Management Portal</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Manager Sign In</h2>
          <p className="text-xs text-slate-400 mt-1">Access your restaurant dashboard, orders, and live analytics</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Manager Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter manager email"
                autoComplete="username"
                className="glass-input pl-10 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter manager password"
                autoComplete="current-password"
                className="glass-input pl-10 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 p-0.5 text-slate-400 hover:text-white transition focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {loading && loginElapsed >= 2 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              <div>
                <p className="font-bold">Connecting to Cloud Backend ({loginElapsed}s)...</p>
                <p className="text-[11px] text-amber-300/80">First login wakes up the secure server. Subsequent logins are instant (~0.5s)!</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 mt-2"
          >
            {loading ? (loginElapsed >= 2 ? `Waking Server (${loginElapsed}s)...` : 'Verifying access...') : 'Sign In as Manager'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Customer Guidance Link */}
        <div className="text-center pt-3 pb-1">
          <Link
            to="/login"
            className="text-xs text-slate-400 hover:text-amber-300 transition inline-flex items-center gap-1.5 font-medium"
          >
            <span>Are you a customer?</span>
            <span className="text-amber-400 underline font-bold">Go to Customer Login →</span>
          </Link>
        </div>

        {/* Encrypted Cloud Connection Trust Badge */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Secure Cloud Connection • Worldwide Live Sync</span>
        </div>
      </div>
    </div>
  );
};
