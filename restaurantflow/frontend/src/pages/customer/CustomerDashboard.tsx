import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Leaf, 
  ArrowRight, 
  Utensils, 
  Phone, 
  Mail, 
  Coffee,
  Sparkles
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

  // Real-time live clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch restaurant details
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
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
      <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  const restaurantDisplayName = restaurant?.name || 'cvbnmAuthentic Mess & Cafe';
  const openTimeDisplay = formatTime12h(restaurant?.openingTime || '07:00');
  const closeTimeDisplay = formatTime12h(restaurant?.closingTime || '23:30');
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-16 min-w-0">
      {/* Top Split Hero Card Matching Screenshot */}
      <div className="w-full bg-[#FAF7F0] dark:bg-[#151921] border border-[#EADBCC] dark:border-stone-800 rounded-3xl sm:rounded-[36px] shadow-[0_12px_45px_rgba(40,25,10,0.06)] overflow-hidden relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[480px] lg:min-h-[520px]">
          
          {/* Left Column: Traditional Flourishes, Restaurant Name, Verified Pill, Live Clock */}
          <div className="lg:col-span-6 xl:col-span-6 p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-between space-y-6 relative z-10">
            
            <div className="space-y-4">
              {/* Cursive Tagline with Leaf */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-[#785435] dark:text-[#D4A373] font-['Caveat'] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide">
                  <span>Traditional Taste</span>
                  <Leaf className="w-6 h-6 text-[#16A34A] fill-[#16A34A]/25 -rotate-12" />
                </div>
                <div className="text-[#8C6B4E] dark:text-[#E2C799] font-['Caveat'] text-xl sm:text-2xl lg:text-3xl font-bold">
                  for a Better Tomorrow
                </div>
              </div>

              {/* Bold Serif Restaurant Headline */}
              <h1 className="font-serif font-black text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl text-[#143D2B] dark:text-[#E8F3ED] tracking-tight leading-[1.12] break-words">
                {restaurantDisplayName}
              </h1>

              {/* Verified Restaurant Pill */}
              <div className="pt-1">
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0D5C3A] text-white text-xs font-bold shadow-sm">
                  <CheckCircle2 className="w-4 h-4 fill-white text-[#0D5C3A]" />
                  <span>Verified Restaurant</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-[#44403C] dark:text-stone-300 text-sm sm:text-base leading-relaxed font-medium pt-1 max-w-xl">
                {restaurant?.description ||
                  'Authentic South Indian Meals, Tiffin, Parotta, Dosa, Chaats and Fresh Juices crafted daily with fresh ingredients.'}
              </p>
            </div>

            {/* Date & Live Ticking Clock */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[#1C1917] dark:text-stone-200 text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#78716C] dark:text-stone-400" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <Clock className="w-4 h-4 text-[#78716C] dark:text-stone-400" />
                  <span>{formattedTime}</span>
                </div>
              </div>

              {/* Bottom Cursive Quote */}
              <div className="pt-1">
                <span className="font-['Caveat'] text-[#8C5E3C] dark:text-[#E2C799] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide block">
                  Good Food Brings People Together
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Feast Image with Golden Dosa, Idlis on Banana Leaf & Filter Coffee */}
          <div className="lg:col-span-6 xl:col-span-6 relative min-h-[340px] sm:min-h-[440px] lg:min-h-full overflow-hidden bg-stone-900 group">
            <img
              src="/images/south_indian_dosa_feast.jpg"
              alt="Authentic South Indian Feast"
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />

            {/* Subtle Edge Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#FAF7F0] dark:lg:from-[#151921] lg:via-transparent lg:to-black/20 pointer-events-none opacity-90" />

            {/* Floating Cursive Badge on Top Right */}
            <div className="absolute top-6 right-5 sm:top-8 sm:right-8 bg-[#1C1917]/75 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-right shadow-xl">
              <div className="flex items-center justify-end gap-1.5 text-amber-300 font-['Caveat'] text-2xl sm:text-3xl font-bold">
                <Coffee className="w-5 h-5 text-amber-300" />
                <span>South Indian</span>
              </div>
              <div className="font-['Caveat'] text-white text-xl sm:text-2xl font-bold -mt-1">
                Goodness Everyday
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom 3 Cards Row Matching Screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-stretch w-full">
        
        {/* Card 1: Operating Hours (col-span-1 md:col-span-4) */}
        <div className="md:col-span-4 bg-[#FAF7F0] dark:bg-[#151921] border border-[#EADBCC] dark:border-stone-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#165834] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Clock className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
              Operating Hours
            </span>
            <span className="text-base sm:text-lg font-black text-[#1C1917] dark:text-stone-100 font-mono block">
              {openTimeDisplay} - {closeTimeDisplay}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-[#16A34A] animate-pulse' : 'bg-rose-500'}`} />
              <span className={isOpen ? 'text-[#15803D] dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {isOpen ? 'Currently Open & Serving' : 'Currently Closed'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Location & Address (col-span-1 md:col-span-5) */}
        <div className="md:col-span-5 bg-[#FAF7F0] dark:bg-[#151921] border border-[#EADBCC] dark:border-stone-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#9A3412] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <MapPin className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
              Location & Address
            </span>
            <p className="text-xs sm:text-sm font-semibold text-[#1C1917] dark:text-stone-200 leading-snug line-clamp-2">
              {restaurant?.address || '124 Gourmet Boulevard, Koramangala 4th Block, Bengaluru, Karnataka 560034'}
            </p>
          </div>
        </div>

        {/* Card 3: Brand Badge (col-span-1 md:col-span-3) */}
        <div className="md:col-span-3 bg-[#FAF7F0] dark:bg-[#151921] border border-[#EADBCC] dark:border-stone-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex items-center justify-center gap-3.5 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 rounded-full bg-[#EBF7EE] dark:bg-emerald-950/50 flex items-center justify-center flex-shrink-0">
            <Leaf className="w-7 h-7 text-[#155E3D] fill-[#155E3D]/30 -rotate-12" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-['Caveat'] text-[#8C5E3C] dark:text-[#E2C799] text-2xl sm:text-3xl font-bold leading-tight">
              Good Food
            </span>
            <span className="font-['Caveat'] text-[#8C5E3C] dark:text-[#E2C799] text-2xl sm:text-3xl font-bold leading-none">
              Happier Days
            </span>
          </div>
        </div>

      </div>

      {/* Quick Action Navigation to Menu */}
      <div className="bg-gradient-to-r from-[#143D2B] via-[#1A4F38] to-[#206346] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h3 className="font-serif font-bold text-lg sm:text-2xl">Craving Fresh South Indian Delicacies?</h3>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 font-sans max-w-xl">
            Hot crispy dosas, steaming soft idlis, aromatic filter coffee, and traditional meals prepared live in our kitchen.
          </p>
        </div>

        <Link
          to="/customer/menu"
          className="px-7 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-900 font-black text-sm flex items-center gap-2 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
        >
          <Utensils className="w-4 h-4" />
          <span>Order From Today's Menu</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Contact & Support Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F0] dark:bg-[#151921] border border-[#EADBCC] dark:border-stone-800 flex items-center gap-3.5 shadow-xs">
          <div className="p-3 rounded-xl bg-white dark:bg-stone-800 text-[#9A3412] shadow-2xs">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 block tracking-wider">
              Direct Contact
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-[#1C1917] dark:text-stone-200">
              {restaurant?.phone || '+91 98765 43210'}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F0] dark:bg-[#151921] border border-[#EADBCC] dark:border-stone-800 flex items-center gap-3.5 shadow-xs">
          <div className="p-3 rounded-xl bg-white dark:bg-stone-800 text-[#0D5C3A] shadow-2xs">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 block tracking-wider">
              Email Inquiries
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-[#1C1917] dark:text-stone-200">
              {restaurant?.email || 'contact@nalansmess.com'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
