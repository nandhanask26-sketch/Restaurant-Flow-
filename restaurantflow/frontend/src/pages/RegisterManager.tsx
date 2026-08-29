import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Store, User, Mail, Phone, Lock, ArrowLeft, ArrowRight, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const RegisterManager: React.FC = () => {
  const [formData, setFormData] = useState({
    managerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    restaurantName: '',
    restaurantAddress: '',
    restaurantPhone: '',
    restaurantDescription: '',
    openingTime: '08:00',
    closingTime: '22:00',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const isLengthValid = formData.password.length >= 6;
  const isMatch = formData.password.length > 0 && formData.password === formData.confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLengthValid) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/register/manager', formData);
      const { user, accessToken, refreshToken, restaurantId } = data.data;

      setAuth(user, accessToken, refreshToken, restaurantId);
      navigate('/manager/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (err.response?.data?.errors && err.response.data.errors[0]?.message) ||
          'Registration failed. Please verify your details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl glass-card p-8 bg-slate-900/90 border-slate-800 rounded-3xl shadow-2xl">
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
          <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <ChefHat className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Restaurant<span className="text-amber-400">Flow</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-100">Register Restaurant & Manager</h2>
          <p className="text-xs text-slate-400 mt-1">
            Setup your restaurant, configure food items, and manage incoming smart order queues
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Manager Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Manager Name</label>
                <input
                  type="text"
                  name="managerName"
                  required
                  value={formData.managerName}
                  onChange={handleChange}
                  placeholder="Rajesh Kumar"
                  className="glass-input text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Manager Phone</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="glass-input text-xs py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Manager Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="manager@example.com"
                className="glass-input text-xs py-2"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 chars"
                    className="glass-input pr-10 text-xs py-2 w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="glass-input pr-10 text-xs py-2 w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Validation Hints */}
            {formData.password.length > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5">
                  {isLengthValid ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span className={isLengthValid ? 'text-emerald-400' : 'text-slate-400'}>
                    At least 6 characters (Current: {formData.password.length})
                  </span>
                </div>
                {formData.confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {isMatch ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span className={isMatch ? 'text-emerald-400' : 'text-rose-400'}>
                      {isMatch ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> Restaurant Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  name="restaurantName"
                  required
                  value={formData.restaurantName}
                  onChange={handleChange}
                  placeholder="Nalans Mess"
                  className="glass-input text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Restaurant Phone</label>
                <input
                  type="tel"
                  name="restaurantPhone"
                  required
                  value={formData.restaurantPhone}
                  onChange={handleChange}
                  placeholder="+91 80 4567 8900"
                  className="glass-input text-xs py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Restaurant Address</label>
              <input
                type="text"
                name="restaurantAddress"
                required
                value={formData.restaurantAddress}
                onChange={handleChange}
                placeholder="124 Gourmet Boulevard, Bengaluru"
                className="glass-input text-xs py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                name="restaurantDescription"
                rows={2}
                value={formData.restaurantDescription}
                onChange={handleChange}
                placeholder="Authentic South Indian & Biriyani specialties..."
                className="glass-input text-xs py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
          >
            {loading ? 'Creating Manager & Restaurant...' : 'Complete Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/manager/login" className="font-semibold text-amber-400 hover:underline">
              Manager Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
