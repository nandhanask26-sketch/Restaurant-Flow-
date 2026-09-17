import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShoppingBag, 
  Sparkles,
  ShieldCheck,
  Banknote,
  AlertCircle,
  XCircle,
  Printer,
  ChefHat,
  Copy,
  Check,
  Utensils,
  Clock,
  Calendar,
  KeyRound
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../../api/client';
import { Order } from '../../types';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../types/socketEvents';
import { getPassOtp, formatTokenDate, formatTokenTime } from '../../utils/token';

export const CustomerOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);


  const { on, off } = useSocket();

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;
      try {
        const { data } = await apiClient.get(`/orders/${id}`);
        setOrder(data.data);
      } catch (err) {
        console.error('Failed to load order:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [id]);

  useEffect(() => {
    const handleOrderUpdate = (updatedOrder: Order) => {
      if (updatedOrder.id === id) {
        setOrder((prev) => (prev ? { ...prev, ...updatedOrder } : updatedOrder));
      }
    };

    on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderUpdate);
    on(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleOrderUpdate);
    on(SOCKET_EVENTS.ORDER_DELIVERED, handleOrderUpdate);

    return () => {
      off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderUpdate);
      off(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleOrderUpdate);
      off(SOCKET_EVENTS.ORDER_DELIVERED, handleOrderUpdate);
    };
  }, [id, on, off]);

  const handleCopyToken = () => {
    if (!order?.orderToken) return;
    navigator.clipboard.writeText(order.orderToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyOtp = () => {
    const otp = getPassOtp(order?.qrCode?.verificationCode, order?.id);
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-10 space-y-4">
        <LoadingSkeleton className="h-[480px] w-full rounded-3xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Order Pass Not Found</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">The requested order pass does not exist or may have expired.</p>
        <Link to="/customer/orders" className="btn-primary inline-flex text-xs px-5 py-2.5">
          View My Orders
        </Link>
      </div>
    );
  }

  const isCod = order.paymentMethod === 'CASH_ON_DELIVERY' || order.payment?.paymentMethod === 'CASH_ON_DELIVERY';
  const isPaid = order.payment?.status === 'PAID' && !isCod;
  const isUpiRejected = (order.paymentMethod === 'UPI' || order.payment?.paymentMethod === 'UPI') && !isPaid;
  const isRedeemed = order.status === 'DELIVERED' || order.qrCode?.isScanned;
  const verificationCode = order.qrCode?.verificationCode || `VERIFY-${order.id.substring(0, 8).toUpperCase()}`;

  const passOtp = getPassOtp(order.qrCode?.verificationCode, order.id);
  const formattedTokenDate = formatTokenDate(order.requestedFoodAt || order.createdAt);
  const { timeStr: tokenServingTime, slotLabel: tokenSlotLabel } = formatTokenTime(
    order.requestedFoodAt,
    order.preferredTimeType
  );

  // Operational status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'READY':
        return {
          label: 'Ready for Pickup!',
          badgeClass: 'bg-emerald-500/15 text-[#0D5C3A] dark:text-emerald-400 border-emerald-500/30',
          dotClass: 'bg-emerald-500 animate-ping',
          description: 'Your food is ready at the counter! Please show your pass now.',
        };
      case 'PREPARING':
        return {
          label: 'Preparing in Kitchen',
          badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
          dotClass: 'bg-amber-500 animate-pulse',
          description: 'Chef is preparing your meal with authentic fresh ingredients.',
        };
      case 'DELIVERED':
        return {
          label: 'Collected & Completed',
          badgeClass: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30',
          dotClass: 'bg-stone-400',
          description: 'Order successfully delivered and verified at the counter.',
        };
      case 'CANCELLED':
        return {
          label: 'Order Cancelled',
          badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
          dotClass: 'bg-rose-500',
          description: 'This order was cancelled.',
        };
      default:
        return {
          label: 'In Kitchen Queue',
          badgeClass: 'bg-[#0D5C3A]/10 text-[#0D5C3A] dark:text-emerald-400 border-[#0D5C3A]/25',
          dotClass: 'bg-[#0D5C3A] animate-pulse',
          description: 'Order confirmed and waiting in the priority kitchen queue.',
        };
    }
  };

  const statusInfo = getStatusInfo(order.status);
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in pb-20 px-3 sm:px-4 w-full">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 pt-2 print:hidden">
        <Link
          to="/customer/orders"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#151A21] border border-[#E8DFD1] dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-[#0D5C3A] transition shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>My Orders</span>
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#151A21] border border-[#E8DFD1] dark:border-stone-800 text-xs font-bold text-stone-800 dark:text-stone-200 hover:text-[#0D5C3A] transition shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-emerald-400" />
          <span>Print Pass</span>
        </button>
      </div>

      {/* If UPI payment was REJECTED / DECLINED */}
      {isUpiRejected ? (
        <div className="bg-white dark:bg-[#151A21] border-2 border-rose-500/30 rounded-[2rem] shadow-xl p-6 sm:p-8 space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 mx-auto">
            <XCircle className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              UPI Payment Incomplete
            </span>
            <h2 className="text-2xl font-serif font-extrabold text-stone-900 dark:text-stone-100 pt-1">
              No Pickup Pass Generated
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-sm mx-auto leading-relaxed">
              Your UPI payment was not completed or authorization timed out. To receive hot meals at the counter, please place your order with verified payment or Cash on Delivery.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#0E1217] border border-[#E8DFD1] dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 max-w-md mx-auto space-y-1 text-left">
            <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Token #{order.orderToken} Status: Payment Pending</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 pl-6 leading-relaxed">
              Only verified orders receive an authoritative, scannable QR pass recognized by cafeteria kitchen counters.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/customer/menu"
              className="btn-primary w-full sm:w-auto text-xs px-6 py-3 font-bold"
            >
              Back to Menu & Order Again
            </Link>
          </div>
        </div>
      ) : (
        /* The Professional Digital Dining Pass (Ticket Design) */
        <div className="bg-white dark:bg-[#151A21] border border-[#E8DFD1] dark:border-stone-800 rounded-[2.2rem] shadow-xl overflow-hidden relative transition-colors">
          {/* Top Brand & Status Section */}
          <div className="p-6 sm:p-7 bg-gradient-to-b from-[#FDFBF7] to-white dark:from-[#1A222D] dark:to-[#151A21] border-b border-[#ECE5D8] dark:border-stone-800/80">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0D5C3A] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  N
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-stone-900 dark:text-stone-100 text-base sm:text-lg leading-tight">
                    Nalan's Mess
                  </h3>
                  <span className="text-[11px] font-bold text-[#78716C] dark:text-stone-400 uppercase tracking-widest block">
                    Digital Dining Pass
                  </span>
                </div>
              </div>

              {/* Live Status Badge */}
              <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 ${statusInfo.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                <span>{statusInfo.label}</span>
              </div>
            </div>

            {/* Token & Pass OTP Dual Hero Display */}
            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Token Number Card */}
                <div className="p-4 rounded-2xl bg-[#EBF7EE] dark:bg-emerald-950/40 border-2 border-[#0D5C3A]/25 dark:border-emerald-500/30 flex flex-col items-center justify-center text-center shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#0D5C3A] dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Pickup Token Number
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-mono font-black text-[#0D5C3A] dark:text-emerald-300 tracking-wider">
                      #{order.orderToken}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      title="Copy token number"
                      className="p-1 rounded-lg text-[#0D5C3A] dark:text-emerald-400 hover:bg-[#0D5C3A]/10 transition"
                    >
                      {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 opacity-70" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-[#0D5C3A]/80 dark:text-emerald-400/80 font-medium mt-0.5">
                    Show to staff at counter
                  </span>
                </div>

                {/* 2. Generated Pass OTP Card */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#19222E] border-2 border-[#E2DDD3] dark:border-stone-700 flex flex-col items-center justify-center text-center shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-300 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-500" />
                    Generated Pass OTP
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-mono font-black text-amber-700 dark:text-amber-400 tracking-widest">
                      {passOtp.slice(0, 3)} {passOtp.slice(3)}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      title="Copy pass OTP"
                      className="p-1 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition"
                    >
                      {copiedOtp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 opacity-70" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                    Speak or show OTP to counter
                  </span>
                </div>
              </div>

              {/* Token Time & Date Information Bar */}
              <div className="p-3.5 rounded-2xl bg-stone-100/80 dark:bg-[#10151C] border border-[#E2DDD3] dark:border-stone-800 text-xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                  <Calendar className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">
                      Token Date
                    </span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {formattedTokenDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">
                      Token Serving Time
                    </span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {tokenServingTime} <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">({tokenSlotLabel})</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">
                    Order Placed
                  </span>
                  <span className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Presentation Inset */}
          <div className="p-6 sm:p-7 flex flex-col items-center justify-center text-center">
            <div className="relative p-4 sm:p-5 bg-white rounded-2xl shadow-md border-2 border-[#0D5C3A]/20 dark:border-emerald-500/30 inline-block">
              {/* Top Token & OTP badge on QR */}
              <div className="mb-2 px-3.5 py-1 bg-[#FAF8F5] text-[#0D5C3A] rounded-full text-[11px] font-mono font-black border border-[#E2DDD3] shadow-2xs flex items-center justify-center gap-2 mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D5C3A] animate-pulse" />
                <span>TOKEN #{order.orderToken}</span>
                <span className="text-stone-400">•</span>
                <span className="text-amber-700">OTP {passOtp}</span>
              </div>

              <QRCodeSVG
                value={verificationCode}
                size={185}
                level="H"
                includeMargin={false}
                className={isRedeemed ? 'opacity-20 grayscale' : ''}
              />

              <div className="mt-2.5 text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-xs font-mono font-black text-stone-900 tracking-wider">
                  <span>Pass OTP:</span>
                  <span className="text-[#0D5C3A] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    {passOtp}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-500 block uppercase">
                  {verificationCode}
                </span>
              </div>

              {/* Redeemed Stamp Overlay */}
              {isRedeemed && (
                <div className="absolute inset-0 m-2 rounded-xl bg-white/95 dark:bg-stone-950/95 backdrop-blur-2xs flex flex-col items-center justify-center p-3 text-center border-2 border-emerald-600 shadow-lg animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1.5">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                    COLLECTED & REDEEMED
                  </span>
                  <span className="text-[11px] text-stone-600 dark:text-stone-300 font-bold">
                    Food Supplied at Counter
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified'}
                  </span>
                </div>
              )}
            </div>

            {/* Payment & Security Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
              {isPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-[#0D5C3A] dark:text-emerald-400 border border-emerald-500/25 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PAID via UPI (₹{order.totalAmount.toFixed(0)}){order.payment?.transactionId ? ` • Ref: ${order.payment.transactionId}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                  <Banknote className="w-3.5 h-3.5" />
                  Cash on Delivery — Pay ₹{order.totalAmount.toFixed(0)} at Counter
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#0E1217] text-stone-600 dark:text-stone-400 border border-[#E2DDD3] dark:border-stone-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-emerald-400" />
                Single-use pass (Scanned once)
              </span>
            </div>
          </div>

          {/* Ticket Perforation Notch & Dashed Line */}
          <div className="relative my-1">
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#FAF8F5] dark:bg-[#0E1217] rounded-full border-r border-[#E8DFD1] dark:border-stone-800 shadow-inner" />
            <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#FAF8F5] dark:bg-[#0E1217] rounded-full border-l border-[#E8DFD1] dark:border-stone-800 shadow-inner" />
            <div className="border-t-2 border-dashed border-[#E2DDD3] dark:border-stone-700 mx-5" />
          </div>

          {/* Lower Stub: Receipt & Food Items Breakdown */}
          <div className="p-6 sm:p-7 bg-[#FAF8F5] dark:bg-[#12161E] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DFD1] dark:border-stone-800">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400" />
                Ordered Food Items Bill
              </span>
              <span className="text-xs font-mono font-bold text-[#0D5C3A] dark:text-emerald-400">
                #{order.orderToken}
              </span>
            </div>

            <div className="space-y-2.5">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-[#EDE7DC] dark:border-stone-800/60 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {item.foodName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-stone-200/60 dark:bg-stone-800 text-[11px] font-bold text-stone-700 dark:text-stone-300 font-mono">
                      × {item.quantity}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                    ₹{item.totalPrice.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="pt-3 border-t border-[#E8DFD1] dark:border-stone-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Items Subtotal</span>
                <span className="font-mono font-semibold text-stone-700 dark:text-stone-300">₹{order.totalAmount.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Kitchen Charges & Packaging</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">FREE / Included</span>
              </div>
              <div className="pt-2 border-t border-[#E8DFD1] dark:border-stone-800 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Total Amount:
                </span>
                <span className="text-2xl font-mono font-black text-[#0D5C3A] dark:text-emerald-400">
                  ₹{order.totalAmount.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Order Timestamps & Ref */}
            <div className="pt-2 border-t border-[#EDE7DC] dark:border-stone-800/60 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Placed at {formattedDate}</span>
              </span>
              <span className="font-mono text-[10px]">
                ID: {order.id.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Counter Instructions Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151A21] border border-[#E8DFD1] dark:border-stone-800 flex items-start gap-3.5 shadow-2xs">
        <div className="p-2.5 rounded-xl bg-[#0D5C3A]/10 text-[#0D5C3A] dark:text-emerald-400 flex-shrink-0">
          <ChefHat className="w-5 h-5" />
        </div>
        <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
          <h4 className="font-bold text-stone-900 dark:text-stone-100">
            Counter Pickup Instructions
          </h4>
          <p className="leading-relaxed">
            Please show Token <strong className="font-mono font-bold text-[#0D5C3A] dark:text-emerald-400">#{order.orderToken}</strong> and Pass OTP <strong className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">{passOtp}</strong> to the counter staff. They will scan your QR code to verify your food items and hand over your meal.
          </p>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white dark:bg-[#151A21] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-[#DDD0C0] dark:border-stone-700 text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
        >
          <Printer className="w-4 h-4 text-[#0D5C3A] dark:text-emerald-400" />
          <span>Print Official Pass</span>
        </button>

        <Link
          to="/customer/menu"
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0D5C3A] hover:bg-[#09452b] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-[#0D5C3A]/25"
        >
          <Utensils className="w-4 h-4" />
          <span>Order More Items</span>
        </Link>
      </div>
    </div>
  );
};
