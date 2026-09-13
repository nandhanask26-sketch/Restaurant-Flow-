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
  Server,
  Globe,
  Wifi,
  RefreshCw 
} from 'lucide-react';
import { apiClient, getApiBaseUrl } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const ManagerLogin: React.FC = () => {
  const [email, setEmail] = useState('manager@example.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginElapsed, setLoginElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [customServer, setCustomServer] = useState(
    () => localStorage.getItem('rf_custom_server') || ''
  );
  const [showServerConfig, setShowServerConfig] = useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

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
      const { data } = await apiClient.post('/auth/login', { 
        email: cleanEmail, 
        password: cleanPassword 
      });
      const { user, accessToken, refreshToken, restaurantId } = data.data;

      if (user.role !== 'RESTAURANT_MANAGER' && user.role !== 'ADMIN') {
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

  const handleSetServer = (serverUrl: string) => {
    if (serverUrl) {
      localStorage.setItem('rf_custom_server', serverUrl);
    } else {
      localStorage.removeItem('rf_custom_server');
    }
    setCustomServer(serverUrl);
    window.location.reload();
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
                placeholder="manager@example.com"
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
                placeholder="••••••••"
                className="glass-input pl-10 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

        {/* Server Connection Status & Quick Switcher */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition"
          >
            <Server className="w-3.5 h-3.5 text-amber-400" />
            <span>Target: {customServer ? 'Local Wi-Fi (10.18.101.206)' : 'Worldwide Cloud (Render)'}</span>
            <span className="text-[10px] text-amber-400 font-bold underline ml-1">
              {showServerConfig ? 'Hide' : 'Switch'}
            </span>
          </button>

          {showServerConfig && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs animate-fade-in">
              <p className="text-slate-300 font-bold text-[11px]">Select Backend Target:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSetServer('')}
                  className={`p-2 rounded-xl border text-left text-[11px] transition ${
                    !customServer 
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Worldwide Cloud</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">4G/5G mobile & any Wi-Fi</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetServer('http://10.18.101.206:5000')}
                  className={`p-2 rounded-xl border text-left text-[11px] transition ${
                    customServer?.includes('10.18.101.206') 
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Wifi className="w-3.5 h-3.5 text-amber-400" />
                    <span>Local Wi-Fi</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">10.18.101.206:5000</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
