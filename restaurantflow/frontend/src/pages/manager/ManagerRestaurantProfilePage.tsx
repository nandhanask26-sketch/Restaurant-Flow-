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
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../../api/client';
import { Restaurant } from '../../types';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80';

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
              imageUrl: data.imageUrl || DEFAULT_COVER,
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
    <div className="max-w-5xl mx-auto space-y-7 animate-fade-in pb-20">
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

      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Restaurant Profile & QR Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Customize restaurant details, kitchen status, and merchant payment QR code</p>
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
                placeholder="e.g. Nalan's Mess"
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
                placeholder="e.g. contact@nalansmess.com"
                className="input-field text-xs"
              />
            </div>
          </div>
        </div>

        {/* Customer Payment & QR Code Gateway Configuration */}
        <div className="glass-card p-6 bg-slate-900 border-slate-800 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-brand-400" />
              Customer Payment & QR Gateway Configuration
            </h3>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowStandeeModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition hover:scale-105"
              >
                <Maximize2 className="w-3.5 h-3.5 text-brand-400" />
                <span>Customer Standee & Print</span>
              </button>
              <span className="badge-emerald text-[10px]">Instant Live Updates</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              {/* Beneficiary Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Merchant / Beneficiary Display Name
                </label>
                <input
                  type="text"
                  value={formData.upiName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, upiName: e.target.value }))}
                  placeholder="e.g. SK Nandhana / Nalan's Mess"
                  className="input-field text-xs font-semibold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Name shown to customers during payment verification and on physical table standees.
                </p>
              </div>

              {/* Custom Payment QR Upload */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200">
                      Payment QR Code Image
                    </label>
                    <p className="text-[10px] text-slate-400">
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
                    className="px-3.5 py-2 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 border border-brand-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{formData.qrCodeUrl ? 'Change QR Image from Document' : 'Upload QR Image from Document'}</span>
                  </button>

                  {formData.qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, qrCodeUrl: '' }))}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset to Standard QR</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live QR Preview Box */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase font-bold text-slate-400">Live Customer QR Preview</span>
                <span className="text-[10px] font-mono text-emerald-400">Scan-Ready</span>
              </div>
              
              <div className="p-3.5 bg-white rounded-2xl shadow-xl border-2 border-brand-500/30 inline-block">
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
                <p className="text-xs font-bold text-white truncate">{formData.upiName || formData.name || "Restaurant"}</p>
                <p className="text-[10px] text-slate-400">Scan with any UPI app to pay</p>
              </div>

              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={() => setShowStandeeModal(true)}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-brand-400 border border-slate-700 flex items-center justify-center gap-1.5 transition hover:border-brand-500/40"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>View Customer Standee & Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-sm font-bold text-white">Save All Profile & Payment Settings</h4>
            <p className="text-xs text-slate-400">
              All changes persist permanently in the database and synchronize live across all customer devices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => executeSave(formData)}
              disabled={saveStatus === 'saving' || !formData.name.trim()}
              className="btn-primary text-xs py-3 px-6 flex items-center gap-2 shadow-glow"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-brand-500/40 p-7 rounded-3xl shadow-2xl text-center space-y-5">
            <button
              onClick={() => setShowStandeeModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mb-1">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-white">{formData.upiName || formData.name || "Restaurant"}</h2>
              <p className="text-xs text-brand-400 font-semibold">Official Payment Standee</p>
            </div>

            <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-brand-500/20 inline-block">
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
              <p className="text-xs font-semibold text-slate-200">
                Scan with Any UPI App to Pay
              </p>
              <p className="text-[10px] text-slate-400">
                Google Pay • PhonePe • Paytm • BHIM • CRED
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 transition shadow-glow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Standee</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Merchant Gateway • Instant Verification</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
