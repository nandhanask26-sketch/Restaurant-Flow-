import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Calendar, 
  Utensils, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Store,
  Compass
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Restaurant } from '../../types';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../types/socketEvents';

export const CustomerDashboard: React.FC = () => {
  const { restaurantStatus, restaurantId } = useOutletContext<{
    restaurantStatus?: boolean;
    restaurantId?: string;
  }>();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch restaurant details & active orders
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch restaurant profile
        let targetId = restaurantId;
        if (!targetId) {
          const res = await apiClient.get('/restaurants');
          if (res.data?.data?.length > 0) {
            targetId = res.data.data[0].id;
          }
        }

        if (targetId) {
          const res = await apiClient.get(`/restaurants/${targetId}`);
          if (isMounted && res.data?.data) {
            setRestaurant(res.data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load restaurant home data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  // Real-time WebSocket listener for automatic live updates from manager
  const { on, off } = useSocket();
  useEffect(() => {
    const handleRestaurantUpdated = (updatedRestaurant: Restaurant) => {
      if (!restaurantId || updatedRestaurant.id === restaurantId) {
        setRestaurant((prev) => (prev ? { ...prev, ...updatedRestaurant } : updatedRestaurant));
      }
    };

    const handleStatusChanged = (data: { restaurantId: string; isOpen: boolean }) => {
      if (!restaurantId || data.restaurantId === restaurantId) {
        setRestaurant((prev) => (prev ? { ...prev, isOpen: data.isOpen } : null));
      }
    };

    on(SOCKET_EVENTS.RESTAURANT_UPDATED, handleRestaurantUpdated);
    on(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, handleStatusChanged);

    return () => {
      off(SOCKET_EVENTS.RESTAURANT_UPDATED, handleRestaurantUpdated);
      off(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, handleStatusChanged);
    };
  }, [restaurantId, on, off]);

  // Format 24hr time to 12hr AM/PM
  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes < 10 ? '0' : ''}${minutes} ${period}`;
  };

  const isOpen = restaurantStatus !== undefined ? restaurantStatus : (restaurant?.isOpen ?? true);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-7 animate-fade-in pb-20 px-2.5 sm:px-0 w-full max-w-full overflow-x-hidden">
      {/* Restaurant Showcase Card */}
      <div className="glass-card bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative w-full max-w-full">
        {/* Cover Photo Banner */}
        <div className="relative h-48 sm:h-80 w-full bg-slate-950 overflow-hidden">
          <img
            src={
              restaurant?.imageUrl ||
              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'
            }
            alt={restaurant?.name || 'Restaurant'}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />

          {/* Vignette & Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />

          {/* Top Left: Live Open / Closed Status Pill */}
          <div className="absolute top-3 left-3 sm:top-6 sm:left-6">
            <div
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-black backdrop-blur-md border flex items-center gap-1.5 sm:gap-2 shadow-2xl ${
                isOpen
                  ? 'bg-emerald-950/85 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
                  : 'bg-rose-950/85 text-rose-300 border-rose-500/50 shadow-rose-950/50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="tracking-wide">
                {isOpen ? 'OPEN TODAY' : 'CLOSED TODAY'}
              </span>
            </div>
          </div>

          {/* Top Right: Live Date & Time Clock */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs text-slate-300 font-mono shadow-xl">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Restaurant Body Information */}
        <div className="p-3.5 sm:p-8 relative -mt-10 sm:-mt-20 space-y-5 sm:space-y-6">
          {/* Identity Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3.5 sm:gap-5">
            {/* Logo Badge */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center text-white font-black text-2xl sm:text-4xl flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-inner">
                {restaurant?.name ? restaurant.name.charAt(0) : 'R'}
              </div>
            </div>

            {/* Name & Verification */}
            <div className="text-center sm:text-left space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {restaurant?.name || "Nalan's Mess"}
                </h1>
                <span className="badge-emerald text-[10px] sm:text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Verified
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span>
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* Description Section */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              About Our Restaurant
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {restaurant?.description ||
                'Authentic South Indian Meals, Tiffin, Parotta, Dosa, Chaats, and Fresh Juices crafted daily with fresh ingredients.'}
            </p>
          </div>

          {/* Coordinate Details Grid: Timings, Location & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Operating Timings */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex-shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Operating Hours
                </span>
                <span className="text-xs sm:text-sm font-bold text-white font-mono block">
                  {formatTime12h(restaurant?.openingTime || '08:00')} – {formatTime12h(restaurant?.closingTime || '22:00')}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {isOpen ? 'Currently Open & Serving' : 'Currently Paused'}
                </span>
              </div>
            </div>

            {/* 2. Physical Location */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex-shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Location & Address
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-200 block leading-snug">
                  {restaurant?.address || '124 Gourmet Boulevard, City Center'}
                </span>
              </div>
            </div>

            {/* 3. Phone Contact */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex-shrink-0 mt-0.5">
                <Phone className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Contact Number
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-200 block">
                  {restaurant?.phone || '+91 98765 43210'}
                </span>
              </div>
            </div>

            {/* 4. Support Email */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex-shrink-0 mt-0.5">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Official Email
                </span>
                <span className="text-xs sm:text-sm font-mono font-semibold text-slate-200 block">
                  {restaurant?.email || 'contact@nalansmess.com'}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Banner */}
          <div className="pt-2">
            <Link
              to="/customer/menu"
              className="btn-primary w-full py-3.5 px-6 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-xl shadow-brand-500/25 group transition-all hover:scale-[1.01]"
            >
              <Utensils className="w-4 h-4" />
              <span>Browse Today's Fresh Menu</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
