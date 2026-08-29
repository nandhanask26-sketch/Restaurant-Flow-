import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  QrCode, 
  Flame, 
  ShoppingBag, 
  Store,
  CreditCard,
  Banknote
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../../api/client';
import { Order } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { PaymentGatewayModal } from '../../components/PaymentGatewayModal';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../types/socketEvents';

export const CustomerOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
  }, [id]);

  useEffect(() => {
    const handleUpdate = (updated: Order) => {
      if (updated.id === id) {
        setOrder((prev) => (prev ? { ...prev, ...updated } : updated));
      }
    };

    on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleUpdate);
    on(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleUpdate);

    return () => {
      off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleUpdate);
      off(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleUpdate);
    };
  }, [id, on, off]);

  if (loading) return <LoadingSkeleton count={3} />;
  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Order not found.</p>
        <Link to="/customer/orders" className="btn-primary mt-4 inline-block text-xs">
          Back to Orders
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
    { key: 'PREPARING', label: 'Kitchen Preparing', icon: Flame },
    { key: 'READY', label: 'Ready for Pickup', icon: Clock },
    { key: 'DELIVERED', label: 'Delivered', icon: ShoppingBag },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 0;
      case 'PREPARING':
        return 1;
      case 'READY':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex(order.status);
  const verificationCode = order.qrCode?.verificationCode || `VERIFY-${order.id.substring(0, 8).toUpperCase()}`;
  const isPaid = order.payment?.status === 'PAID';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <Link
        to="/customer/orders"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </Link>

      {/* Header Banner */}
      <div className="glass-card p-6 bg-slate-900 border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs uppercase font-bold text-slate-400">Order Token</span>
            <span className="text-2xl font-mono font-extrabold text-brand-400">
              {order.orderToken}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} size="lg" />
          <StatusBadge status={order.payment?.status || 'PAID'} size="lg" />
        </div>
      </div>

      {/* Live Order Timeline */}
      <div className="glass-card p-6 bg-slate-900 border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-6">
          Live Order Status Timeline
        </h3>

        <div className="grid grid-cols-4 gap-2 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx <= currentStep && order.status !== 'CANCELLED';
            const isCurrent = idx === currentStep && order.status !== 'CANCELLED';

            return (
              <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isCurrent
                      ? 'bg-brand-500 text-white shadow-glow animate-bounce'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-950 text-slate-600 border border-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isCompleted ? 'text-slate-200' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* QR Code Pickup Pass (Shown ONLY after payment or COD) */}
        <div className="glass-card p-6 bg-slate-900 border-slate-800 flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-brand-400" />
            Contactless Pickup Pass
          </h3>

          {isPaid || order.payment?.paymentMethod === 'CASH_ON_DELIVERY' ? (
            <>
              <p className="text-xs text-slate-400 mb-4">
                Show this QR code at the counter to collect your order
              </p>

              <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-2 border-brand-500/20 mb-3">
                <QRCodeSVG value={verificationCode} size={150} level="H" includeMargin={true} />
              </div>

              <p className="text-[11px] font-mono text-brand-400 font-bold bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                {verificationCode}
              </p>

              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-3">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isPaid ? 'Payment Confirmed' : 'Cash on Delivery (Pay at Pickup)'}</span>
              </div>
            </>
          ) : (
            <div className="py-6 space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <QrCode className="w-8 h-8 opacity-40" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-300">Payment Pending</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  QR pickup pass will be automatically generated once payment is completed to management.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="btn-primary text-xs py-2.5 px-5 flex items-center justify-center gap-2 mx-auto shadow-glow font-bold"
              >
                <CreditCard className="w-4 h-4" />
                Pay ₹{order.totalAmount.toFixed(0)} via Google Pay / UPI
              </button>
            </div>
          )}
        </div>

        {/* Order Details & Bill */}
        <div className="glass-card p-6 bg-slate-900 border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800">
            Order Summary
          </h3>

          <div className="space-y-2 text-xs">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-slate-300">
                <span>
                  {item.foodName} <strong className="text-brand-400">× {item.quantity}</strong>
                </span>
                <span>₹{item.totalPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-200">₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-extrabold text-white">
              <span>Total Payable:</span>
              <span className="text-brand-400 text-base">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              <span>
                Target Time: <strong className="text-slate-200">{new Date(order.requestedFoodAt).toLocaleTimeString()}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-brand-400" />
              <span>Restaurant: {order.restaurantName || 'Nalans Mess'}</span>
            </div>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentGatewayModal
          isOpen={true}
          order={order}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={(updated) => {
            setOrder(updated);
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
};
