import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  QrCode, 
  ShoppingBag, 
  Sparkles,
  ShieldCheck,
  CreditCard,
  Banknote
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../../api/client';
import { Order } from '../../types';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../types/socketEvents';

export const CustomerOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const { on, off } = useSocket();

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;
      try {
        const { data } = await apiClient.get(`/orders/${id}`);
        setOrder(data.data);
      } catch (err) {
        console.error('Failed to load order details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();

    // Listen for live updates when manager scans QR
    const handleStatusUpdated = (payload: { orderId: string; status: string; deliveredAt?: string }) => {
      if (payload.orderId === id) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: payload.status as any,
                deliveredAt: payload.deliveredAt || new Date().toISOString(),
                qrCode: prev.qrCode ? { ...prev.qrCode, isScanned: true } : prev.qrCode,
              }
            : null
        );
      }
    };

    on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleStatusUpdated);
    on(SOCKET_EVENTS.ORDER_DELIVERED, handleStatusUpdated);

    return () => {
      off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleStatusUpdated);
      off(SOCKET_EVENTS.ORDER_DELIVERED, handleStatusUpdated);
    };
  }, [id, on, off]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-4">
        <LoadingSkeleton className="h-10 w-48 rounded-xl" />
        <LoadingSkeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Order Not Found</h2>
        <p className="text-xs text-slate-400">The requested order pass does not exist.</p>
        <Link to="/customer/orders" className="btn-primary inline-flex text-xs px-4 py-2">
          View My Orders
        </Link>
      </div>
    );
  }

  const isRedeemed = order.status === 'DELIVERED' || order.qrCode?.isScanned;
  const isPaid = order.payment?.status === 'PAID' && order.payment?.paymentMethod !== 'CASH_ON_DELIVERY';
  const verificationCode = order.qrCode?.verificationCode || `VERIFY-${order.id.substring(0, 8).toUpperCase()}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-16 px-3 sm:px-4">
      {/* Back navigation */}
      <Link
        to="/customer/orders"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </Link>

      {/* Main Card: Token Number & Generated Pickup QR */}
      <div className="glass-card p-6 bg-slate-900 border-2 border-brand-500/30 rounded-3xl shadow-2xl space-y-6 text-center">
        {/* Token Number Highlight */}
        <div className="pb-4 border-b border-slate-800 space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-400">
            <Sparkles className="w-3.5 h-3.5" />
            Cafeteria Pickup Token Number
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-black text-brand-400 tracking-tight my-2">
            {order.orderToken}
          </div>
          <p className="text-xs text-slate-400">
            Show this token number and QR code at the counter to collect your food
          </p>
        </div>

        {/* Uniquely Generated Pickup QR Code with Prominent Token Number */}
        <div className="flex flex-col items-center">
          <div className="relative p-5 bg-white rounded-3xl inline-flex flex-col items-center shadow-2xl border-4 border-brand-500/40 mb-3">
            {/* Top QR Token Badge */}
            <div className="mb-2.5 px-3 py-1 bg-slate-900 text-brand-400 rounded-full text-xs font-mono font-black border border-slate-700 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
              <span>TOKEN #{order.orderToken}</span>
            </div>

            <QRCodeSVG
              value={verificationCode}
              size={195}
              level="H"
              includeMargin={false}
              className={isRedeemed ? 'opacity-15 grayscale' : ''}
            />

            {/* Bottom QR Verification / Scan Caption */}
            <div className="mt-2.5 text-center">
              <span className="text-[11px] font-mono font-bold text-slate-800 tracking-wide block">
                {order.orderToken}
              </span>
              <span className="text-[9px] font-mono text-slate-500 block uppercase">
                {verificationCode}
              </span>
            </div>

            {/* Overlay Stamp when Scanned & Used */}
            {isRedeemed && (
              <div className="absolute inset-0 m-2 rounded-2xl bg-slate-950/92 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center border border-emerald-500/50 shadow-inner animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-2">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <span className="text-sm font-black text-emerald-300 uppercase tracking-widest">
                  USED & REDEEMED
                </span>
                <span className="text-xs text-slate-200 font-bold mt-0.5">
                  Food Supplied at Counter
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-1">
                  {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Redeemed'}
                </span>
              </div>
            )}
          </div>

          {/* Payment & Security Status */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-xs">
            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PAID via UPI (₹{order.totalAmount.toFixed(0)}){order.payment?.transactionId ? ` • Ref: ${order.payment.transactionId}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                <Banknote className="w-3.5 h-3.5" />
                Cash on Delivery — Pay ₹{order.totalAmount.toFixed(0)} at Counter
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              Single-use pass (Scanned once)
            </span>
          </div>
        </div>

        {/* Ordered Food Items Bill */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-brand-400" />
              Ordered Food Items Bill
            </span>
            <span className="text-xs font-mono font-bold text-brand-400">
              #{order.orderToken}
            </span>
          </div>

          <div className="space-y-2">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs py-1 text-slate-200 border-b border-slate-900 last:border-0"
              >
                <span className="font-semibold">
                  {item.foodName} <strong className="text-brand-400 ml-1">× {item.quantity}</strong>
                </span>
                <span className="font-mono font-bold text-slate-100">
                  ₹{item.totalPrice.toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Amount:</span>
            <span className="text-lg font-mono font-black text-brand-400">
              ₹{order.totalAmount.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Counter Instructions */}
        <div className="text-[11px] text-slate-400 pt-1">
          {isRedeemed ? (
            <p className="text-emerald-400 font-semibold">
              ✅ Food has been collected. This QR pass is expired and cannot be reused.
            </p>
          ) : (
            <p>
              Please wait for token <strong className="text-brand-400 font-mono">#{order.orderToken}</strong> to be announced at the counter. The staff will scan this QR to deliver your food.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
