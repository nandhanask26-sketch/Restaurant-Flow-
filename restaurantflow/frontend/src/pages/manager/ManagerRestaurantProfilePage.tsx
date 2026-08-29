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
  FolderOpen
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Restaurant } from '../../types';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80';

export const ManagerRestaurantProfilePage: React.FC = () => {
  const { restaurantId } = useOutletContext<{
    restaurantId?: string;
  }>();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);
  const skipAutoSave = useRef(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    openingTime: '08:00',
    closingTime: '22:00',
    imageUrl: '',
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
            skipAutoSave.current = true;
            setRestaurant(data);
            setFormData({
              name: data.name || '',
              description: data.description || '',
              address: data.address || '',
              phone: data.phone || '',
              email: data.email || '',
              openingTime: data.openingTime || '08:00',
              closingTime: data.closingTime || '22:00',
              imageUrl: data.imageUrl || DEFAULT_COVER,
              isOpen: data.isOpen ?? true,
            });
            setTimeout(() => {
              skipAutoSave.current = false;
            }, 100);
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

  // Direct Save Function
  const executeSave = async (dataToSave: typeof formData) => {
    if (!restaurant?.id) return;

    setSaveStatus('saving');
    setError(null);

    try {
      const res = await apiClient.patch(`/restaurants/${restaurant.id}`, dataToSave);
      const updated: Restaurant = res.data?.data;
      if (updated) {
        setRestaurant(updated);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaveStatus('error');
      setError(err.response?.data?.message || 'Failed to auto-save changes');
    }
  };

  // Debounced Auto-Save on text fields
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (skipAutoSave.current || loading || !restaurant?.id) {
      return;
    }

    const timer = setTimeout(() => {
      executeSave(formData);
    }, 600);

    return () => clearTimeout(timer);
  }, [formData]);

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
    <div className="max-w-5xl mx-auto space-y-7 animate-fade-in pb-20">
      {/* Hidden Native Document / File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. Header & Live Status */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Restaurant Profile</h1>

        {/* Live Auto-Save Indicator Status */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </div>
          )}

          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saved</span>
            </div>
          )}

          {saveStatus === 'idle' && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Auto-Save Active</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Save Error</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message if any */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* 2. Dedicated Open / Close Operational Status Controller */}
      <div className="glass-card p-5 bg-slate-900 border-slate-800 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-2xl border transition-colors ${
              formData.isOpen
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            <Power className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">Restaurant Operational Status</span>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                  formData.isOpen
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {formData.isOpen ? 'ONLINE • ACCEPTING ORDERS' : 'OFFLINE • ORDERS PAUSED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {formData.isOpen
                ? 'Kitchen is live. Customers can browse menu and place real-time orders.'
                : 'Kitchen is paused. Customers will be notified that the restaurant is closed today.'}
            </p>
          </div>
        </div>

        {/* 1-Click Open/Close Selector Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              formData.isOpen
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${formData.isOpen ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
            <span>OPEN TODAY</span>
          </button>

          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              !formData.isOpen
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${!formData.isOpen ? 'bg-white' : 'bg-slate-500'}`} />
            <span>CLOSED TODAY</span>
          </button>
        </div>
      </div>

      {/* 3. Restaurant Profile Showcase Card with Document File Picker */}
      <div className="glass-card bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Cover Banner */}
        <div className="relative h-60 sm:h-72 w-full bg-slate-950 overflow-hidden group">
          <img
            src={formData.imageUrl || DEFAULT_COVER}
            alt={formData.name || 'Restaurant'}
            className="w-full h-full object-cover transition-all duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_COVER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Direct "Choose from Document / Files" Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-950/85 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/80 shadow-2xl flex items-center gap-2 transition hover:scale-105 active:scale-95"
              title="Upload image directly from your computer / documents"
            >
              <FolderOpen className="w-4 h-4 text-brand-400" />
              <span>Choose from Document</span>
            </button>
          </div>
        </div>

        {/* Identity & Body Preview */}
        <div className="p-6 sm:p-8 relative -mt-14 sm:-mt-16 space-y-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center text-white font-black text-2xl sm:text-3xl flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-inner">
                {formData.name ? formData.name.charAt(0).toUpperCase() : 'R'}
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {formData.name || 'Your Restaurant Name'}
                </h2>
                <span className="badge-emerald text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-1">
                <Calendar className="w-3 h-3 text-brand-400" />
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

          {/* About text preview */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-400" />
              About Our Restaurant
            </span>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {formData.description || 'Describe your restaurant delicacies, cuisine specialties, and heritage.'}
            </p>
          </div>

          {/* Coordinates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
              <Clock className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Operating Hours</span>
                <span className="font-bold text-white font-mono">
                  {formatTime12h(formData.openingTime)} – {formatTime12h(formData.closingTime)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                <span className="font-semibold text-slate-200 line-clamp-1">
                  {formData.address || 'Provide physical street address'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Restaurant Profile Management Editor Form (Auto-Saving) */}
      <div className="space-y-6">
        {/* Business Details & Description */}
        <div className="glass-card p-6 bg-slate-900 border-slate-800 rounded-3xl space-y-5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-brand-400" />
            Restaurant Details & Culinary Story
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Restaurant Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Spice Garden"
                className="input-field text-xs"
              />
            </div>

            {/* Description / Story */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                About / Culinary Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your authentic food items, specialties, and ingredients..."
                className="input-field text-xs resize-none"
              />
            </div>
          </div>
        </div>

        {/* Location, Operating Hours & Contact */}
        <div className="glass-card p-6 bg-slate-900 border-slate-800 rounded-3xl space-y-5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-400" />
            Location, Operating Hours & Contact Coordinates
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Physical Address & Landmark <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. 124 Gourmet Boulevard, Koramangala 4th Block, Bengaluru"
                className="input-field text-xs"
              />
            </div>

            {/* Opening Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Opening Time (Daily)
              </label>
              <input
                type="time"
                value={formData.openingTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, openingTime: e.target.value }))}
                className="input-field text-xs"
              />
            </div>

            {/* Closing Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Closing Time (Daily)
              </label>
              <input
                type="time"
                value={formData.closingTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, closingTime: e.target.value }))}
                className="input-field text-xs"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. +91 98765 43210"
                className="input-field text-xs"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Support Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. contact@spicegarden.com"
                className="input-field text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
