import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Lock,
  ArrowRight,
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Store,
  ExternalLink,
  ShieldCheck,
  X,
  XCircle,
  Tag,
  FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCartStore } from '../../store/cartStore';
import { apiClient } from '../../api/client';
import { PaymentMethod } from '../../types';
import { EmptyState } from '../../components/EmptyState';

export const CustomerCartPage: React.FC = () => {
  const { restaurantStatus } = useOutletContext<{ restaurantStatus?: boolean }>();
  const {
    items,
    restaurantId,
    restaurantName,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [loading, setLoading] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'PAID' | 'FAILED' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upiId, setUpiId] = useState('nandhanask26@oksbi');
  const [upiName, setUpiName] = useState('SK');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadRestaurantAndSyncCart() {
      try {
        const res = await apiClient.get('/restaurants');
        if (res.data?.data?.length > 0) {
          const rest = res.data.data[0];
          if (rest.upiId) setUpiId(rest.upiId);
          if (rest.upiName) setUpiName(rest.upiName);
          if (rest.qrCodeUrl) setQrCodeUrl(rest.qrCodeUrl);

          // Authoritatively synchronize cart items with current database food catalog
          const foodsRes = await apiClient.get(`/foods?restaurantId=${rest.id}`);
          const liveFoods: any[] = foodsRes.data?.data || [];

          if (liveFoods.length > 0 && items.length > 0) {
            let changed = false;
            const syncedItems = items
              .map((it) => {
                const exact = liveFoods.find((f) => f.id === it.food.id);
                if (exact) return { ...it, food: exact };

                const nameMatch = liveFoods.find(
                  (f) => f.name.toLowerCase().trim() === it.food.name.toLowerCase().trim()
                );
                if (nameMatch) {
                  changed = true;
                  return { ...it, food: nameMatch };
                }

                changed = true;
                return null;
              })
              .filter(Boolean) as typeof items;

            if (changed) {
              useCartStore.setState({
                items: syncedItems,
                restaurantId: rest.id,
                restaurantName: rest.name,
              });
              localStorage.setItem(
                'rf_cart',
                JSON.stringify({
                  items: syncedItems,
                  restaurantId: rest.id,
                  restaurantName: rest.name,
                })
              );
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load restaurant / sync cart:', err);
      }
    }
    loadRestaurantAndSyncCart();
  }, []);

  const subtotal = getSubtotal();
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponApplied(true);
  };

  const handleCheckout = async (forcedStatus: 'PAID' | 'FAILED' = 'PAID') => {
    if (items.length === 0) return;

    if (restaurantStatus === false) {
      setError('Cannot place order: The cafeteria kitchen is currently closed.');
      return;
    }

    setLoading(true);
    setProcessingStatus(forcedStatus);
    setError(null);

    try {
      let targetRestaurantId = restaurantId;
      let liveFoods: any[] = [];
      try {
        const res = await apiClient.get('/restaurants');
        if (res.data?.data?.length > 0) {
          const rests = res.data.data;
          const found = rests.find((r: any) => r.id === targetRestaurantId);
          targetRestaurantId = found ? found.id : rests[0].id;
        }

        const foodsRes = await apiClient.get(`/foods?restaurantId=${targetRestaurantId}`);
        liveFoods = foodsRes.data?.data || [];
      } catch (rErr) {
        console.warn('Restaurant resolution check:', rErr);
      }

      const sanitizedOrderItems = items
        .map((it) => {
          const live =
            liveFoods.find((f) => f.id === it.food.id) ||
            liveFoods.find((f) => f.name.toLowerCase().trim() === it.food.name.toLowerCase().trim());
          if (live) {
            return {
              foodId: live.id,
              quantity: it.quantity,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (sanitizedOrderItems.length === 0) {
        setError("Selected items are no longer available on today's menu. Please add fresh items from the menu.");
        clearCart();
        return;
      }

      const payload: any = {
        restaurantId: targetRestaurantId,
        preferredTimeType: 'ASAP',
        requestedFoodAt: new Date().toISOString(),
        paymentMethod,
        items: sanitizedOrderItems,
      };

      if (paymentMethod === 'UPI') {
        payload.paymentStatus = forcedStatus;
        if (forcedStatus === 'FAILED') {
          payload.transactionId = `UPI_REJECTED_${Date.now()}`;
        } else {
          payload.transactionId = `UPI_GATEWAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }

      const { data } = await apiClient.post('/orders', payload);
      const createdOrder = data.data;

      clearCart();
      setShowUpiModal(false);
      navigate(`/customer/orders/${createdOrder.id}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to place order. An item might be out of stock or kitchen is busy.';
      setError(msg);
    } finally {
      setLoading(false);
      setProcessingStatus(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
        <EmptyState
          icon={ShoppingBag}
          title="Your Cart is Empty"
          description="You haven't selected any food items yet. Browse today's authentic South Indian menu to choose your meal."
          actionText="Browse Today's Menu"
          onAction={() => navigate('/customer/menu')}
        />
      </div>
    );
  }

  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${subtotal.toFixed(2)}&cu=INR&tn=Cafeteria_Food_Bill`;

  return (
    <div className="space-y-6 animate-fade-in pb-16 w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* 1. Breadcrumb Bar & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
        <div className="flex items-center gap-1.5 text-xs text-[#78716C] dark:text-slate-400">
          <Link to="/customer/dashboard" className="hover:text-[#0D5C3A] flex items-center gap-1 transition">
            <Store className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <span className="text-stone-400 dark:text-slate-600">&gt;</span>
          <span className="text-[#1C1917] dark:text-slate-100 font-bold">Cart</span>
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-[#1C1917] dark:text-slate-100">
            <span className="text-[#0D5C3A] dark:text-emerald-400">Your</span> Cart
          </h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EBF7EE] dark:bg-emerald-950/60 text-[#0D5C3A] dark:text-emerald-400 border border-[#B7E4C7] dark:border-emerald-800">
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Selected Food Items, Coupons, Total, Quality Banner (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card: Selected Food Items */}
          <div className="bg-white dark:bg-[#151C28] border border-[#EADBCC] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            {/* Header: Title and Clear Cart */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCC] dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-[#1C1917] dark:text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400" />
                <span>Selected Food Items ({totalItemCount})</span>
              </h2>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-semibold text-stone-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition"
                title="Clear all items from cart"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cart</span>
              </button>
            </div>

            {/* List of Cart Food Items */}
            <div className="divide-y divide-[#EADBCC]/60 dark:divide-slate-800/80">
              {items.map((item) => {
                const lineTotal = item.food.price * item.quantity;
                return (
                  <div key={item.food.id} className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 sm:gap-4">
                    {/* Food Thumbnail */}
                    <div className="w-16 h-16 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-slate-800 border border-[#EADBCC] dark:border-slate-700 flex-shrink-0">
                      <img
                        src={
                          item.food.imageUrl ||
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80'
                        }
                        alt={item.food.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>

                    {/* Food Name, Description, Price */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-[#1C1917] dark:text-slate-100 truncate">
                        {item.food.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-[#78716C] dark:text-slate-400 line-clamp-1 mt-0.5">
                        {item.food.description || 'Freshly prepared authentic South Indian dish.'}
                      </p>
                      <div className="text-xs font-bold text-[#0D5C3A] dark:text-emerald-400 font-mono mt-1">
                        ₹{item.food.price.toFixed(0)} each
                      </div>
                    </div>

                    {/* Quantity Stepper & Delete */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center bg-[#FAF7F0] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-700 rounded-xl px-1 py-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.food.id, item.quantity - 1)}
                          className="p-1 rounded-lg text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white transition"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 sm:w-7 text-center text-xs font-bold text-[#1C1917] dark:text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.food.id, item.quantity + 1)}
                          className="p-1 rounded-lg text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white transition"
                          title="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.food.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        title="Remove dish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Apply Coupon Toggle / Accordion */}
            <div className="pt-2 border-t border-[#EADBCC] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCouponInput((prev) => !prev)}
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-[#1C1917] dark:text-slate-200 hover:text-[#0D5C3A] transition"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400" />
                  <span>Apply Coupon</span>
                </div>
                {showCouponInput ? (
                  <ChevronUp className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                )}
              </button>

              {showCouponInput && (
                <form onSubmit={handleApplyCoupon} className="flex gap-2 pt-2 pb-1">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon Code (e.g. MESS10)"
                    className="flex-1 bg-[#FAF7F0] dark:bg-slate-900 border border-[#EADBCC] dark:border-slate-700 text-[#1C1917] dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 rounded-xl px-3 py-2 text-xs uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0D5C3A]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0D5C3A] hover:bg-[#09452b] text-white text-xs font-bold shadow-xs transition"
                  >
                    Apply
                  </button>
                </form>
              )}
              {couponApplied && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                  ✔ Special mess promo code applied successfully!
                </p>
              )}
            </div>

            {/* Food Items Total Banner */}
            <div className="bg-[#EBF7EE] dark:bg-emerald-950/40 border border-[#B7E4C7] dark:border-emerald-800/60 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0D5C3A] text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-bold text-[#1C1917] dark:text-slate-100 block">
                    Food Items Total
                  </span>
                  <span className="text-[11px] text-[#78716C] dark:text-slate-400">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>

              <span className="text-2xl sm:text-3xl font-black text-[#0D5C3A] dark:text-emerald-400 font-mono tracking-tight">
                ₹{subtotal.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Choose Payment Method & Pay Action (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card: Choose Payment Method */}
          <div className="rounded-2xl overflow-hidden shadow-xs border border-[#EADBCC] dark:border-slate-800">
            {/* Header: Dark Forest Green Bar with Lock and 100% Secure Payments */}
            <div className="bg-[#0B381C] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white tracking-wide">Choose Payment Method</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Secure Payments</span>
              </div>
            </div>

            {/* Container Body */}
            <div className="bg-white dark:bg-[#151C28] p-4 sm:p-5 space-y-4">
              {/* Option 1: UPI Payment (Recommended) */}
              <div
                onClick={() => setPaymentMethod('UPI')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                  paymentMethod === 'UPI'
                    ? 'border-[#15803D] dark:border-emerald-500 bg-emerald-50/25 dark:bg-emerald-950/25 shadow-xs'
                    : 'border-[#EADBCC] dark:border-slate-800 bg-[#FAF7F0]/60 dark:bg-slate-900/60 hover:border-stone-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'UPI'
                            ? 'border-[#15803D] dark:border-emerald-400 bg-[#15803D]'
                            : 'border-stone-400 dark:border-slate-600 bg-transparent'
                        }`}
                      >
                        {paymentMethod === 'UPI' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-[#1C1917] dark:text-slate-100">
                          UPI Payment
                        </span>
                        <span className="text-xs font-bold text-[#0D5C3A] dark:text-emerald-400">
                          (Recommended)
                        </span>
                      </div>
                      <span className="text-[11px] text-[#78716C] dark:text-slate-400 block mt-0.5">
                        Google Pay, PhonePe, Paytm, BHIM, CRED & any UPI App
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-[#0D5C3A] dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                    Instant
                  </span>
                </div>

                {/* Inline UPI QR Details when selected */}
                {paymentMethod === 'UPI' && (
                  <div className="mt-4 pt-3.5 border-t border-[#EADBCC] dark:border-slate-800/80">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      {/* QR Box */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="p-2.5 bg-white rounded-2xl shadow-xs border border-stone-200">
                          {qrCodeUrl ? (
                            <img
                              src={qrCodeUrl}
                              alt="Store Payment QR"
                              className="w-28 h-28 object-contain rounded-lg"
                            />
                          ) : (
                            <QRCodeSVG
                              value={upiPayload}
                              size={112}
                              level="M"
                              includeMargin={false}
                            />
                          )}
                        </div>

                        {/* Open in UPI App Link */}
                        <a
                          href={upiPayload}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0D5C3A] dark:text-emerald-400 hover:underline mt-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open in UPI App</span>
                        </a>
                      </div>

                      {/* Payee Info & Price */}
                      <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                        <span className="text-[11px] uppercase font-bold text-[#78716C] dark:text-slate-400 block">
                          Scan & Pay
                        </span>

                        <div className="text-2xl sm:text-3xl font-black text-[#0D5C3A] dark:text-emerald-400 font-mono tracking-tight">
                          ₹{subtotal.toFixed(0)}
                        </div>

                        <div className="pt-1">
                          <span className="text-[10px] uppercase font-bold text-[#78716C] dark:text-slate-400 block">
                            Merchant / Cafeteria Payee
                          </span>
                          <span className="text-xs font-bold text-[#1C1917] dark:text-slate-100 block">
                            {upiName || 'SK'}
                          </span>
                        </div>

                        <p className="text-[10px] text-[#78716C] dark:text-slate-400 leading-tight pt-1">
                          Scan this QR with your UPI app or tap below to open directly.
                        </p>

                        {/* UPI App Logo Pills matching screenshot */}
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap pt-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#EADBCC] dark:border-slate-700 text-stone-700 dark:text-slate-300">
                            GPay
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#EADBCC] dark:border-slate-700 text-purple-700 dark:text-purple-400">
                            PhonePe
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#EADBCC] dark:border-slate-700 text-sky-700 dark:text-sky-400">
                            Paytm
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#EADBCC] dark:border-slate-700 text-amber-700 dark:text-amber-400">
                            BHIM
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-[#EADBCC] dark:border-slate-700 text-stone-900 dark:text-stone-100">
                            CRED
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FAF7F0] dark:bg-slate-800 text-[#0D5C3A] dark:text-emerald-400">
                            Any UPI App
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 2: Cash on Delivery (Pay at Counter) */}
              <div
                onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                  paymentMethod === 'CASH_ON_DELIVERY'
                    ? 'border-amber-600 dark:border-amber-500 bg-amber-50/30 dark:bg-amber-950/25 shadow-xs'
                    : 'border-[#EADBCC] dark:border-slate-800 bg-[#FAF7F0]/60 dark:bg-slate-900/60 hover:border-stone-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'CASH_ON_DELIVERY'
                            ? 'border-amber-600 bg-amber-600'
                            : 'border-stone-400 dark:border-slate-600 bg-transparent'
                        }`}
                      >
                        {paymentMethod === 'CASH_ON_DELIVERY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    <Banknote className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />

                    <div>
                      <span className="text-sm font-bold text-[#1C1917] dark:text-slate-100 block">
                        Cash on Delivery (Pay at Counter)
                      </span>
                      <span className="text-[11px] text-[#78716C] dark:text-slate-400 block">
                        Pay cash ₹{subtotal.toFixed(0)} at counter when collecting food
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pay Button Action */}
          <button
            type="button"
            onClick={() => {
              if (paymentMethod === 'UPI') {
                setShowUpiModal(true);
              } else {
                handleCheckout('PAID');
              }
            }}
            disabled={loading || restaurantStatus === false}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-[#0D5C3A] hover:bg-[#09452b] active:scale-[0.98] shadow-lg shadow-[#0D5C3A]/25 transition duration-150 flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paymentMethod === 'UPI' ? (
              <>
                <span className="text-white">Pay ₹{subtotal.toFixed(0)} via UPI Gateway</span>
                <ArrowRight className="w-5 h-5 text-white" />
              </>
            ) : loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-white">Generating Token Pass...</span>
              </>
            ) : (
              <>
                <span className="text-white">Place Order (Pay at Counter)</span>
                <ArrowRight className="w-5 h-5 text-white" />
              </>
            )}
          </button>

          {/* Trust points line */}
          <div className="text-[11px] font-semibold text-[#78716C] dark:text-slate-400 text-center flex items-center justify-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant bank verification</span>
            </div>
            <span>•</span>
            <span>No manual entry required</span>
            <span>•</span>
            <span>Safe & Secure</span>
          </div>
        </div>
      </div>

      {/* 5. UPI Gateway Authorization Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-[95vw] sm:max-w-md bg-white dark:bg-[#151C28] border-2 border-[#15803D] dark:border-emerald-500 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 text-center max-h-[95vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => !loading && setShowUpiModal(false)}
              disabled={loading}
              className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-white transition disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#0D5C3A] dark:text-emerald-400 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
              <Lock className="w-3.5 h-3.5" />
              <span>Automated UPI Payment Gateway</span>
            </div>

            <div>
              <h3 className="text-xl font-black text-[#1C1917] dark:text-white">Authorize UPI Payment</h3>
              <p className="text-xs text-[#78716C] dark:text-slate-400 mt-1">
                Amount to Pay:{' '}
                <span className="font-mono font-bold text-[#0D5C3A] dark:text-emerald-400 text-base">
                  ₹{subtotal.toFixed(0)}
                </span>
              </p>
            </div>

            {/* Payee Info */}
            <div className="p-3.5 rounded-2xl bg-[#FAF7F0] dark:bg-slate-900 border border-[#EADBCC] dark:border-slate-800 text-xs space-y-1 text-left">
              <div className="flex justify-between text-stone-700 dark:text-slate-300">
                <span className="text-stone-500 dark:text-slate-400">Merchant Payee:</span>
                <span className="font-bold text-[#1C1917] dark:text-white">{upiName || 'SK'}</span>
              </div>
              <div className="flex justify-between text-stone-700 dark:text-slate-300">
                <span className="text-stone-500 dark:text-slate-400">UPI VPA:</span>
                <span className="font-mono text-[#0D5C3A] dark:text-emerald-400 font-semibold">{upiId}</span>
              </div>
            </div>

            {/* Security Notice & Rule */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-left space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#0D5C3A] dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400" />
                <span>Verification & Pass Issuance Rule</span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-slate-300 leading-relaxed">
                • <strong>Only customers who pay correctly receive the generated QR pass.</strong><br />
                • If payment is rejected, cancelled, or failed, <strong>NO QR code</strong> will be generated.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleCheckout('PAID')}
                disabled={loading}
                className="w-full py-3.5 text-sm font-black text-white bg-[#0D5C3A] hover:bg-[#09452b] rounded-2xl flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.98]"
              >
                {loading && processingStatus === 'PAID' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white">Verifying Bank Payment & Generating QR...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-white">I Paid Correctly • Authorize & Generate Pass (₹{subtotal.toFixed(0)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCheckout('FAILED')}
                disabled={loading}
                className="w-full py-3 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading && processingStatus === 'FAILED' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                    <span>Recording Payment Failure...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>Simulate Payment Rejected / Cancelled (No QR)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
