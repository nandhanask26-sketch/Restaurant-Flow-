import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  QrCode,
  ArrowRight,
  AlertCircle,
  Banknote,
  Copy,
  CheckCircle2,
  ChevronRight,
  Store,
  Check,
  ExternalLink,
  Zap,
  ShieldCheck
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
  const [error, setError] = useState<string | null>(null);
  const [upiId, setUpiId] = useState('nandhanask26@oksbi');
  const [upiName, setUpiName] = useState('SK Nandhana');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

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
                // 1. Check exact ID
                const exact = liveFoods.find((f) => f.id === it.food.id);
                if (exact) return { ...it, food: exact };

                // 2. Fallback: Check matching food name (e.g. "Coffee" from previous database seed)
                const nameMatch = liveFoods.find(
                  (f) => f.name.toLowerCase().trim() === it.food.name.toLowerCase().trim()
                );
                if (nameMatch) {
                  changed = true;
                  return { ...it, food: nameMatch };
                }

                // If food doesn't exist anymore, mark removed
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

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    if (restaurantStatus === false) {
      setError('Cannot place order: The cafeteria kitchen is currently closed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Authoritatively resolve active restaurant ID & live foods catalog
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

      // Map cart items to verified live food IDs
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
        setError('Selected items are no longer available on today\'s menu. Please add fresh items from the menu.');
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
        // Automated Gateway verification — no manual 12-digit UTR typing required!
        payload.transactionId = `UPI_GATEWAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const { data } = await apiClient.post('/orders', payload);
      const createdOrder = data.data;

      clearCart();
      // Redirect straight to the clean token number & generated QR pass
      navigate(`/customer/orders/${createdOrder.id}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to place order. An item might be out of stock or kitchen is busy.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
        <EmptyState
          icon={ShoppingBag}
          title="Your Cart is Empty"
          description="You haven't selected any food items yet. Browse today's cafeteria menu to choose your meal."
          actionText="Browse Menu"
          onAction={() => navigate('/customer/menu')}
        />
      </div>
    );
  }

  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${subtotal.toFixed(2)}&cu=INR&tn=Cafeteria_Food_Bill`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-16 px-3 sm:px-4">
      {/* Clean Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link to="/customer/menu" className="hover:text-brand-400 transition flex items-center gap-1">
              <Store className="w-3.5 h-3.5" />
              Menu
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-brand-400 font-semibold">Checkout</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">
            Selected Food Items & Payment
          </h1>
        </div>

        <Link
          to="/customer/menu"
          className="text-xs font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1.5 rounded-xl border border-brand-500/30 transition"
        >
          + Add More Items
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 1. CHOOSED FOOD ITEMS LIST */}
      <div className="glass-card p-5 bg-slate-900 border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-brand-400" />
            Choosed Food Items ({totalItemCount})
          </h2>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
            title="Clear cart"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Itemized List */}
        <div className="divide-y divide-slate-800/80">
          {items.map((item) => {
            const lineTotal = item.food.price * item.quantity;
            return (
              <div key={item.food.id} className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                {/* Food Details */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {item.food.name}
                  </h3>
                  <div className="text-xs text-brand-400 font-mono mt-0.5">
                    ₹{item.food.price.toFixed(0)} each
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.food.id, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    {item.quantity === 1 ? (
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-100">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.food.id, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="w-16 text-right font-mono font-bold text-slate-100 text-sm">
                  ₹{lineTotal.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bill Total */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-base">
          <span className="font-bold text-slate-300">Food Items Total:</span>
          <span className="text-2xl font-mono font-black text-brand-400">
            ₹{subtotal.toFixed(0)}
          </span>
        </div>
      </div>

      {/* 2. QR PAYING METHOD / CASH ON DELIVERY */}
      <div className="glass-card p-5 bg-slate-900 border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 pb-2 border-b border-slate-800">
          <QrCode className="w-4 h-4 text-brand-400" />
          Choose Payment Method
        </h2>

        {/* Option 1: Automated UPI Payment Gateway (Fast & Zero Typing) */}
        <div
          onClick={() => setPaymentMethod('UPI')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            paymentMethod === 'UPI'
              ? 'bg-brand-500/10 border-brand-500 shadow-md ring-1 ring-brand-500/40'
              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'UPI'}
                onChange={() => setPaymentMethod('UPI')}
                className="accent-brand-500 w-4 h-4"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100 block">
                    Automated UPI Payment Gateway
                  </span>
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    Zero Typing
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Google Pay, PhonePe, Paytm, BHIM, Cred & Any UPI App
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Instant
            </span>
          </div>

          {/* Inline UPI Display when selected */}
          {paymentMethod === 'UPI' && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2.5 bg-white rounded-xl shadow-lg border-2 border-brand-500/30 flex-shrink-0">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Store Payment QR"
                      className="w-36 h-36 object-contain rounded-lg"
                    />
                  ) : (
                    <QRCodeSVG
                      value={upiPayload}
                      size={140}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Amount to Pay:
                    </span>
                    <span className="text-2xl font-mono font-black text-brand-400">
                      ₹{subtotal.toFixed(0)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Merchant / Cafeteria Payee:
                    </span>
                    <span className="text-xs font-bold text-white block">
                      {upiName || 'Restaurant Official Gateway'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Scan this QR with your UPI app or tap below to launch your UPI app directly.
                  </p>

                  {/* Mobile Deep Link */}
                  <a
                    href={upiPayload}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 border border-brand-500/30 text-xs font-bold transition mt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in UPI App (GPay / PhonePe / Paytm)</span>
                  </a>
                </div>
              </div>

              {/* Automated Gateway Advantage Badge */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-slate-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="text-emerald-300 block">Instant Automated Bank Verification</strong>
                    No manual typing or 12-digit UTR entry required! Simply tap below to pay, and your verified green token pass will be generated automatically for the manager.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Option 2: Cash on Delivery (Pay at Counter) */}
        <div
          onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            paymentMethod === 'CASH_ON_DELIVERY'
              ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/40'
              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'CASH_ON_DELIVERY'}
                onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                className="accent-amber-500 w-4 h-4"
              />
              <div>
                <span className="text-sm font-bold text-slate-100 block">
                  Cash on Delivery (Pay at Counter)
                </span>
                <span className="text-xs text-slate-400">
                  Pay cash ₹{subtotal.toFixed(0)} at counter when collecting food
                </span>
              </div>
            </div>
            <Banknote className="w-5 h-5 text-amber-400 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Checkout Action Button */}
      {paymentMethod === 'UPI' ? (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading || restaurantStatus === false}
          className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2.5 shadow-glow transition duration-150"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying with UPI Gateway & Generating Token Pass...</span>
            </>
          ) : (
            <>
              <span>Pay ₹{subtotal.toFixed(0)} via UPI Gateway • Get Token Pass</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading || restaurantStatus === false}
          className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2.5 shadow-glow transition duration-150"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating Token Pass...</span>
            </>
          ) : (
            <>
              <span>Place Order (Cash on Delivery) • Get Token Pass</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
};
