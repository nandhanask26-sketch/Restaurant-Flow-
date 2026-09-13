import React, { useEffect, useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Power, 
  Edit3,
  UploadCloud,
  FileImage,
  FolderOpen,
  QrCode,
  Check,
  Printer,
  Maximize2,
  Copy,
  Store,
  Trash2,
  X,
  Coffee
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../../api/client';
import { Restaurant } from '../../types';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

const DEFAULT_COVER = '/images/restaurant_interior_nalan.jpg';

export const ManagerRestaurantProfilePage: React.FC = () => {
  const { restaurantId, setRestaurantName } = useOutletContext<{
    restaurantId?: string;
    setRestaurantName?: (name: string) => void;
  }>();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showStandeeModal, setShowStandeeModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    upiId: 'nandhanask26@oksbi',
    upiName: 'SK Nandhana',
    openingTime: '08:00',
    closingTime: '22:00',
    imageUrl: '',
    qrCodeUrl: '',
    isOpen: true,
  });

  // Real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial restaurant details
  useEffect(() => {
    let isMounted = true;

    async function fetchRestaurant() {
      setLoading(true);
      setError(null);
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
          const data: Restaurant = res.data?.data;
          if (isMounted && data) {
            setRestaurant(data);
            setFormData({
              name: data.name || '',
              description: data.description || '',
              address: data.address || '',
              phone: data.phone || '',
              email: data.email || '',
              upiId: data.upiId || 'nandhanask26@oksbi',
              upiName: data.upiName || 'SK Nandhana',
              openingTime: data.openingTime || '08:00',
              closingTime: data.closingTime || '22:00',
              imageUrl: (data.imageUrl && !data.imageUrl.includes('unsplash.com')) ? data.imageUrl : DEFAULT_COVER,
              qrCodeUrl: data.qrCodeUrl || '',
              isOpen: data.isOpen ?? true,
            });
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.message || 'Failed to load restaurant profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRestaurant();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  // Direct Save Function (triggered by bottom Save button)
  const executeSave = async (dataToSave: typeof formData) => {
    if (!restaurant?.id) return;

    setSaveStatus('saving');
    setError(null);

    try {
      const res = await apiClient.patch(`/restaurants/${restaurant.id}`, dataToSave);
      const updated: Restaurant = res.data?.data;
      if (updated) {
        setRestaurant(updated);
        if (setRestaurantName && updated.name) {
          setRestaurantName(updated.name);
        }
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setError(err.response?.data?.message || 'Failed to save changes');
    }
  };

  // Handle File Pick from Device / Document
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file from your documents (JPG, PNG, WEBP, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Optimize resolution with Canvas
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          const updated = { ...formData, imageUrl: optimizedDataUrl };
          setFormData(updated);
          executeSave(updated);
        } else {
          const updated = { ...formData, imageUrl: rawDataUrl };
          setFormData(updated);
          executeSave(updated);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Payment QR Code Pick from Device / Document
  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file from your documents (JPG, PNG, WEBP, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/png');
          setFormData((prev) => ({ ...prev, qrCodeUrl: optimizedDataUrl }));
        } else {
          setFormData((prev) => ({ ...prev, qrCodeUrl: rawDataUrl }));
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Toggle Live Kitchen Status (Instant Save)
  const handleToggleStatus = async () => {
    if (!restaurant?.id) return;
    const nextStatus = !formData.isOpen;
    const updated = { ...formData, isOpen: nextStatus };
    setFormData(updated);

    setSaveStatus('saving');
    setError(null);

    try {
      const res = await apiClient.patch(`/restaurants/${restaurant.id}/status`, {
        isOpen: nextStatus,
      });
      const updatedRest: Restaurant = res.data?.data;
      if (updatedRest) {
        setRestaurant(updatedRest);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setFormData((prev) => ({ ...prev, isOpen: !nextStatus }));
      setSaveStatus('error');
      setError('Failed to update kitchen status');
    }
  };

  // Format 24hr time to 12hr AM/PM
  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes < 10 ? '0' : ''}${minutes} ${period}`;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Hidden Native Document / File Picker for Cover */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden Native Document / File Picker for Payment QR */}
      <input
        ref={qrFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleQrFileChange}
        className="hidden"
      />

      {/* Error Message if any */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* 1. Hero Showcase Card (Exact visual replica of reference) */}
      <div className="rounded-[2.5rem] bg-white dark:bg-[#151A21] border border-[#ECE7DF] dark:border-stone-800 shadow-md shadow-stone-200/40 dark:shadow-none overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative">
        {/* Left Column: Brand, Story, Meta */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative z-10">
          {/* Subtle Artistic Botanical Leaf Illustration Watermark in Background */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-80 pointer-events-none opacity-25 dark:opacity-10 select-none overflow-hidden hidden sm:block">
            <svg viewBox="0 0 160 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-emerald-800">
              <path d="M140 10C100 50 60 130 80 250" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M82 120C65 100 40 105 30 125C45 140 75 130 82 120Z" fill="currentColor" opacity="0.6" />
              <path d="M95 80C80 60 55 65 45 85C60 100 90 90 95 80Z" fill="currentColor" opacity="0.6" />
              <path d="M110 40C98 25 78 30 70 48C82 60 105 52 110 40Z" fill="currentColor" opacity="0.6" />
              <path d="M85 160C70 145 50 150 42 167C55 180 80 170 85 160Z" fill="currentColor" opacity="0.6" />
              <path d="M92 200C80 190 62 195 58 210C68 220 88 210 92 200Z" fill="currentColor" opacity="0.6" />
            </svg>
          </div>

          <div>
            {/* Script Heading */}
            <div className="flex items-center gap-2">
              <span className="font-script text-3xl sm:text-4xl font-bold text-[#8B4513] tracking-wide">
                Manage with Purpose
              </span>
              <span className="text-2xl select-none" role="img" aria-label="leaf">🍃</span>
            </div>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1 font-normal">
              Keep your restaurant details updated for a smoother service.
            </p>

            {/* Main Restaurant Title */}
            <h1 className="font-serif font-extrabold text-3xl sm:text-4xl lg:text-[46px] text-[#0B3B2C] dark:text-emerald-400 tracking-tight mt-6 leading-tight">
              {formData.name || "Nalan's Mess"}
            </h1>

            {/* Verified Restaurant Badge */}
            <div className="mt-3.5">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0B3B2C] text-white text-xs font-semibold shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                Verified Restaurant
              </span>
            </div>

            {/* Description / Story */}
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed mt-5 max-w-lg">
              {formData.description ||
                'Authentic South Indian Meals, Tiffin, Parotta, Dosa, Chaats and Fresh Juices crafted daily with fresh ingredients.'}
            </p>

            {/* Joined on & Operating Hours */}
            <div className="mt-8 pt-6 border-t border-[#F0EBE1] dark:border-stone-800/80 flex items-center gap-6 sm:gap-10">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-stone-600 dark:text-stone-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block leading-none">Joined on</span>
                  <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 mt-1 block">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-stone-200 dark:bg-stone-700" />

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-stone-600 dark:text-stone-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block leading-none">Operating Hours</span>
                  <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 mt-1 block font-mono">
                    {formatTime12h(formData.openingTime)} – {formatTime12h(formData.closingTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom handwritten quote with curved underline flourish */}
          <div className="mt-8">
            <div className="inline-block relative">
              <p className="font-script text-2xl sm:text-3xl font-bold text-[#8B4513] tracking-wide">
                Good Food Brings People Together
              </p>
              <svg className="w-full h-3 text-[#8B4513] opacity-80 mt-0.5" viewBox="0 0 260 12" fill="none">
                <path d="M2 9C70 2 180 3 258 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: High Quality Restaurant Photo & Floating Badge */}
        <div className="lg:col-span-6 relative min-h-[380px] lg:min-h-[520px] bg-stone-200 dark:bg-stone-800">
          <img
            src={formData.imageUrl || DEFAULT_COVER}
            alt={formData.name || 'Restaurant Dining'}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_COVER;
            }}
          />

          {/* Choose cover image button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-lg flex items-center gap-2 transition hover:scale-105 active:scale-95"
              title="Upload cover image directly from your documents"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>Change Photo</span>
            </button>
          </div>

          {/* Floating Badge in Bottom Right (Exact match with reference) */}
          <div className="absolute bottom-6 right-6 bg-black/75 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-3.5">
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <p className="font-script text-amber-300 text-xl font-bold leading-none tracking-wide">
                South Indian
              </p>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-white/90 leading-tight mt-0.5">
                Tradition Served Fresh
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Dedicated Open / Close Operational Status Controller */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#151A21] border border-[#ECE7DF] dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`p-3.5 rounded-2xl border transition-colors ${
              formData.isOpen
                ? 'bg-emerald-500/10 text-[#0D5C3A] dark:text-emerald-400 border-emerald-500/25'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
            }`}
          >
            <Power className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">Restaurant Operational Status</span>
              <span
                className={`text-[11px] font-black px-3 py-0.5 rounded-full border ${
                  formData.isOpen
                    ? 'bg-emerald-500/10 text-[#0D5C3A] dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {formData.isOpen ? 'ONLINE • ACCEPTING ORDERS' : 'OFFLINE • ORDERS PAUSED'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {formData.isOpen
                ? 'Kitchen is live. Customers can browse menu and place real-time orders.'
                : 'Kitchen is paused. Customers will be notified that the restaurant is closed today.'}
            </p>
          </div>
        </div>

        {/* 1-Click Open/Close Selector Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              formData.isOpen
                ? 'bg-[#0D5C3A] text-white shadow-md shadow-[#0D5C3A]/25 scale-105'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${formData.isOpen ? 'bg-white animate-pulse' : 'bg-stone-400'}`} />
            <span>OPEN TODAY</span>
          </button>

          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              !formData.isOpen
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-105'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${!formData.isOpen ? 'bg-white' : 'bg-stone-400'}`} />
            <span>CLOSED TODAY</span>
          </button>
        </div>
      </div>

      {/* 3. Restaurant Profile Management Editor Form (Auto-Saving) */}
      <div className="space-y-6">
        {/* Business Details & Description */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#151A21] border border-[#ECE7DF] dark:border-stone-800 space-y-5 shadow-sm">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400" />
            Restaurant Details & Culinary Story
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Restaurant Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Nalan's Mess"
                className="w-full bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] outline-none transition-all"
              />
            </div>

            {/* Description / Story */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                About / Culinary Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your authentic food items, specialties, and ingredients..."
                className="w-full bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Location, Operating Hours & Contact */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#151A21] border border-[#ECE7DF] dark:border-stone-800 space-y-5 shadow-sm">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400" />
            Location, Operating Hours & Contact Coordinates
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Physical Address & Landmark <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. 124 Gourmet Boulevard, Koramangala 4th Block, Bengaluru"
                className="w-full bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] outline-none transition-all"
              />
            </div>

            {/* Opening Time */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Opening Time (Daily)
              </label>
              <input
                type="time"
                value={formData.openingTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, openingTime: e.target.value }))}
                className="w-full bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] outline-none transition-all"
              />
            </div>

            {/* Closing Time */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Closing Time (Daily)
              </label>
              <input
                type="time"
                value={formData.closingTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, closingTime: e.target.value }))}
                className="w-full bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] outline-none transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. +91 98765 43210"
                className="w-full bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] outline-none transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Official Support Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. contact@nalansmess.com"
                className="w-full bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Customer Payment & QR Code Gateway Configuration */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#151A21] border border-[#ECE7DF] dark:border-stone-800 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400" />
              Customer Payment & QR Gateway Configuration
            </h3>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowStandeeModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-stone-800 hover:bg-[#F3EFE7] dark:hover:bg-stone-750 text-xs font-bold text-stone-800 dark:text-stone-200 border border-[#E2DDD3] dark:border-stone-700 flex items-center gap-1.5 transition hover:scale-105"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-emerald-400" />
                <span>Customer Standee & Print</span>
              </button>
              <span className="badge-emerald text-[10px]">Instant Live Updates</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              {/* Beneficiary Display Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Merchant / Beneficiary Display Name
                </label>
                <input
                  type="text"
                  value={formData.upiName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, upiName: e.target.value }))}
                  placeholder="e.g. SK Nandhana / Nalan's Mess"
                  className="w-full bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] outline-none transition-all"
                />
                <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                  Name shown to customers during payment verification and on physical table standees.
                </p>
              </div>

              {/* Custom Payment QR Upload */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 dark:text-stone-200">
                      Payment QR Code Image
                    </label>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                      Upload your store's Google Pay, PhonePe, Paytm, or custom UPI standee QR code from documents or photos.
                    </p>
                  </div>
                  {formData.qrCodeUrl && (
                    <span className="badge-emerald text-[10px] px-2 py-0.5">Custom QR Active</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => qrFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-[#0D5C3A]/10 hover:bg-[#0D5C3A]/20 text-[#0D5C3A] dark:text-emerald-400 border border-[#0D5C3A]/25 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{formData.qrCodeUrl ? 'Change QR Image from Document' : 'Upload QR Image from Document'}</span>
                  </button>

                  {formData.qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, qrCodeUrl: '' }))}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset to Standard QR</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live QR Preview Box */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E2DDD3] dark:border-stone-800 flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Live Customer QR Preview</span>
                <span className="text-[10px] font-bold text-[#0D5C3A] dark:text-emerald-400">Scan-Ready</span>
              </div>
              
              <div className="p-3.5 bg-white rounded-2xl shadow-md border-2 border-[#0D5C3A]/20 inline-block">
                {formData.qrCodeUrl ? (
                  <img
                    src={formData.qrCodeUrl}
                    alt="Payment QR Preview"
                    className="w-36 h-36 object-contain rounded-xl"
                  />
                ) : (
                  <QRCodeSVG
                    value={`upi://pay?pa=${encodeURIComponent(formData.upiId || 'nandhanask26@oksbi')}&pn=${encodeURIComponent(formData.upiName || formData.name || "Restaurant")}&cu=INR`}
                    size={135}
                    level="M"
                    includeMargin={false}
                  />
                )}
              </div>

              <div className="space-y-0.5 w-full">
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{formData.upiName || formData.name || "Restaurant"}</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">Scan with any UPI app to pay</p>
              </div>

              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={() => setShowStandeeModal(true)}
                  className="w-full py-2 rounded-xl bg-white dark:bg-stone-800 hover:bg-[#F3EFE7] text-xs font-bold text-[#0D5C3A] dark:text-emerald-400 border border-[#E2DDD3] dark:border-stone-700 flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>View Customer Standee & Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#151A21] border border-[#ECE7DF] dark:border-stone-800 shadow-sm">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">Save All Profile & Payment Settings</h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              All changes persist permanently in the database and synchronize live across all customer devices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => executeSave(formData)}
              disabled={saveStatus === 'saving' || !formData.name.trim()}
              className="px-6 py-3 rounded-xl bg-[#0D5C3A] hover:bg-[#09452b] text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-[#0D5C3A]/20 disabled:opacity-50"
            >
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved to Database!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Profile & QR Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Customer Standee & Printable Billing QR Modal */}
      {showStandeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#151A21] border border-[#E2DDD3] dark:border-stone-700 p-7 rounded-[2rem] shadow-2xl text-center space-y-5">
            <button
              onClick={() => setShowStandeeModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex p-3 rounded-2xl bg-[#0D5C3A]/10 border border-[#0D5C3A]/25 text-[#0D5C3A] dark:text-emerald-400 mb-1">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-serif font-extrabold text-stone-900 dark:text-stone-100">{formData.upiName || formData.name || "Restaurant"}</h2>
              <p className="text-xs text-[#0D5C3A] dark:text-emerald-400 font-bold">Official Payment Standee</p>
            </div>

            <div className="p-4 bg-white rounded-3xl shadow-lg border-4 border-[#0D5C3A]/20 inline-block">
              {formData.qrCodeUrl ? (
                <img
                  src={formData.qrCodeUrl}
                  alt="Customer Standee QR"
                  className="w-52 h-52 object-contain rounded-2xl"
                />
              ) : (
                <QRCodeSVG
                  value={`upi://pay?pa=${encodeURIComponent(formData.upiId || 'nandhanask26@oksbi')}&pn=${encodeURIComponent(formData.upiName || formData.name || 'Restaurant')}&cu=INR`}
                  size={210}
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Scan with Any UPI App to Pay
              </p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                Google Pay • PhonePe • Paytm • BHIM • CRED
              </p>
            </div>

            <div className="pt-2 border-t border-[#ECE7DF] dark:border-stone-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-[#0D5C3A] hover:bg-[#09452b] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Standee</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-emerald-400" />
              <span>Official Merchant Gateway • Instant Verification</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
