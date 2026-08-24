import React, { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Clock, 
  CreditCard, 
  Banknote, 
  QrCode, 
  ArrowRight, 
  AlertCircle,
  UtensilsCrossed,
  CheckCircle2
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { apiClient } from '../../api/client';
import { PaymentMethod, PreferredTimeType, Order } from '../../types';
import { EmptyState } from '../../components/EmptyState';
import { PaymentGatewayModal } from '../../components/PaymentGatewayModal';

export const CustomerCartPage: React.FC = () => {
  const { restaurantStatus } = useOutletContext<{ restaurantStatus?: boolean }>();
  const {
    items,
    restaurantId,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTax,
    getTotal,
  } = useCartStore();

  const [preferredTimeType, setPreferredTimeType] = useState<PreferredTimeType>('ASAP');
  const [scheduledSlot, setScheduledSlot] = useState<string>('12:30 PM');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

  // Generate requested_food_at ISO timestamp based on selection
  const calculateRequestedFoodAt = (): string => {
    const now = new Date();
    if (preferredTimeType === 'ASAP') {
      return new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // ASAP + 15m default
    }

    // Parse scheduled slot time string (e.g. 12:30 PM)
    const [time, modifier] = scheduledSlot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    // If time is earlier than now, assume tomorrow or adjust
    if (scheduledDate.getTime() < now.getTime()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    return scheduledDate.toISOString();
  };

  const [pendingPaymentOrder, setPendingPaymentOrder] = useState<Order | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !restaurantId) return;

    if (restaurantStatus === false) {
      setError('Cannot place order: Restaurant is currently closed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        restaurantId,
        preferredTimeType,
        requestedFoodAt: calculateRequestedFoodAt(),
        paymentMethod,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          foodId: it.food.id,
          quantity: it.quantity,
        })),
      };

      const { data } = await apiClient.post('/orders', payload);
      const createdOrder = data.data;

      if (paymentMethod === 'UPI' || paymentMethod === 'CARD') {
        // Launch Payment Gateway Modal for direct customer-to-management payment
        setPendingPaymentOrder(createdOrder);
      } else {
        // Cash on Delivery
        clearCart();
        navigate(`/customer/orders/${createdOrder.id}`);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to place order. An item might be out of stock or restaurant is closed.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your Cart is Empty"
        description="Explore our authentic menu and add your favorite dishes to begin your order."
        actionText="Explore Menu"
        onAction={() => navigate('/customer/menu')}
      />
    );
  }

  const timeSlots = ['12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '1:00 PM', '1:30 PM', '7:30 PM', '8:00 PM'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-brand-400" />
          Review Your Order & Checkout
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Verify items, choose your preferred food preparation time, and select payment
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-6">
        {/* Left Column: Cart Items List */}
        <div className="md:col-span-7 space-y-4">
          <div className="glass-card p-5 space-y-4 bg-slate-900/90">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200">
                Order Items ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
              <button
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Cart
              </button>
            </div>

            <div className="space-y-3 divide-y divide-slate-800/60">
              {items.map((item) => (
                <div key={item.food.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        item.food.imageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80'
                      }
                      alt={item.food.name}
                      className="w-12 h-12 rounded-xl object-cover bg-slate-800 flex-shrink-0"
                    />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                        {item.food.name}
                      </h4>
                      <p className="text-xs text-brand-400 font-semibold">
                        ₹{item.food.price.toFixed(0)} each
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() => updateQuantity(item.food.id, item.quantity - 1)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-200">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.food.id, item.quantity + 1)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-slate-100 min-w-[50px] text-right">
                      ₹{(item.food.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cooking Instructions Input */}
          <div className="glass-card p-4 bg-slate-900/90">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Special Cooking Instructions / Allergy Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Less spicy, extra raita please..."
              className="glass-input text-xs py-2"
            />
          </div>
        </div>

        {/* Right Column: Time, Payment & Order Summary */}
        <div className="md:col-span-5 space-y-4">
          {/* Preferred Food Time Selector */}
          <div className="glass-card p-5 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-400" />
              Preferred Preparation Time
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferredTimeType('ASAP')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition ${
                  preferredTimeType === 'ASAP'
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🚀 As Soon As Possible</span>
                <span className="text-[10px] text-slate-400 font-normal">Ready in ~15 mins</span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredTimeType('SCHEDULED')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition ${
                  preferredTimeType === 'SCHEDULED'
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📅 Schedule Time</span>
                <span className="text-[10px] text-slate-400 font-normal">Select a pickup slot</span>
              </button>
            </div>

            {preferredTimeType === 'SCHEDULED' && (
              <div className="pt-2">
                <label className="block text-[11px] text-slate-400 mb-1.5">Select Time Slot:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setScheduledSlot(slot)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition ${
                        scheduledSlot === slot
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="glass-card p-5 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-brand-400" />
              Payment Method
            </h3>

            <div className="space-y-2">
              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'UPI'
                    ? 'bg-brand-500/10 border-brand-500/40 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'UPI'}
                    onChange={() => setPaymentMethod('UPI')}
                    className="accent-brand-500"
                  />
                  <div>
                    <p className="text-xs font-bold">UPI / QR Payment</p>
                    <p className="text-[10px] text-slate-400">GPay, PhonePe, Paytm (Instant Verification)</p>
                  </div>
                </div>
                <QrCode className="w-4 h-4 text-brand-400" />
              </label>

              {/* Interactive UPI Payment Preview Container */}
              {paymentMethod === 'UPI' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-brand-500/30 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Scan & Pay with Any UPI App
                    </span>
                    <span className="text-xs font-mono font-extrabold text-brand-400">
                      ₹{subtotal.toFixed(0)}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                    <div className="p-2 bg-white rounded-xl shadow-md flex-shrink-0 flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(
                          `upi://pay?pa=spicegarden@okaxis&pn=Spice%20Garden&am=${subtotal}&cu=INR`
                        )}`}
                        alt="UPI Payment QR"
                        className="w-28 h-28 object-contain"
                      />
                    </div>

                    <div className="space-y-2 text-xs flex-1 text-center sm:text-left">
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium">Merchant UPI ID:</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                          <code className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-brand-400 font-mono text-xs font-bold select-all">
                            spicegarden@okaxis
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('spicegarden@okaxis');
                              setCopiedUpi(true);
                              setTimeout(() => setCopiedUpi(false), 2000);
                            }}
                            className="px-2 py-1 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            {copiedUpi ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              'Copy'
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                        {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'Cred'].map((app) => (
                          <span
                            key={app}
                            className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-semibold text-slate-300"
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'CARD'
                    ? 'bg-brand-500/10 border-brand-500/40 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'CARD'}
                    onChange={() => setPaymentMethod('CARD')}
                    className="accent-brand-500"
                  />
                  <div>
                    <p className="text-xs font-bold">Credit / Debit Card</p>
                    <p className="text-[10px] text-slate-400">Visa, Mastercard, RuPay</p>
                  </div>
                </div>
                <CreditCard className="w-4 h-4 text-brand-400" />
              </label>

              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'CASH_ON_DELIVERY'
                    ? 'bg-amber-500/10 border-amber-500/40 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'CASH_ON_DELIVERY'}
                    onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                    className="accent-amber-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-amber-300">Cash on Delivery (COD)</p>
                    <p className="text-[10px] text-slate-400">Pay cash at the restaurant pickup counter</p>
                  </div>
                </div>
                <Banknote className="w-4 h-4 text-amber-400" />
              </label>
            </div>
          </div>

          {/* Price Breakdown Card (GST Removed) */}
          <div className="glass-card p-5 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Bill Summary
            </h3>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-200">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-slate-800 text-sm font-extrabold text-white">
                <span>Total Payable</span>
                <span className="text-brand-400 text-base">₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading || restaurantStatus === false}
              className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-glow mt-3"
            >
              {loading ? 'Processing Order...' : `Place Order • ₹${subtotal.toFixed(0)}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Gateway Modal for Instant Google Pay / UPI / Card direct payment */}
      {pendingPaymentOrder && (
        <PaymentGatewayModal
          isOpen={true}
          order={pendingPaymentOrder}
          onClose={() => {
            const orderId = pendingPaymentOrder.id;
            setPendingPaymentOrder(null);
            clearCart();
            navigate(`/customer/orders/${orderId}`);
          }}
          onPaymentSuccess={(paidOrder) => {
            setPendingPaymentOrder(null);
            clearCart();
            navigate(`/customer/orders/${paidOrder.id}`);
          }}
        />
      )}
    </div>
  );
};
