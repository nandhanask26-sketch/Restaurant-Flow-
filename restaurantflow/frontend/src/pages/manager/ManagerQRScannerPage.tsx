import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  ScanLine, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag, 
  ShieldCheck, 
  Clock, 
  User,
  Sparkles,
  X,
  Check,
  Loader2,
  Flame,
  Zap,
  RefreshCw,
  Trash2,
  Banknote
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Order } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { SmartQueueCard } from '../../components/SmartQueueCard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../types/socketEvents';

export const ManagerQRScannerPage: React.FC = () => {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();

  const [verificationCode, setVerificationCode] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cashCollecting, setCashCollecting] = useState(false);

  // Smart Order Queue State
  const [queueOrders, setQueueOrders] = useState<Order[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<Order | null>(null);

  // Delivered Orders & Token History State
  const [deliveredHistory, setDeliveredHistory] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const { on, off } = useSocket(restaurantId);

  // Load Smart Queue orders
  const loadQueue = async () => {
    try {
      const { data } = await apiClient.get('/orders/smart-queue');
      setQueueOrders(data.data || []);
    } catch (err) {
      console.error('Failed to load smart queue:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  // Load Delivered Orders & Token History
  const loadDeliveredHistory = async () => {
    try {
      setHistoryLoading(true);
      const url = restaurantId
        ? `/orders?status=DELIVERED&limit=50&restaurantId=${restaurantId}`
        : `/orders?status=DELIVERED&limit=50`;
      const { data } = await apiClient.get(url);
      setDeliveredHistory(data.data || []);
    } catch (err) {
      console.error('Failed to load delivered history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    loadDeliveredHistory();
    const interval = setInterval(() => {
      loadQueue();
      loadDeliveredHistory();
    }, 30000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  // Real-time socket updates for queue and delivered orders
  useEffect(() => {
    const handleRefresh = () => {
      loadQueue();
      loadDeliveredHistory();
    };

    on(SOCKET_EVENTS.ORDER_CREATED, handleRefresh);
    on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleRefresh);
    on(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleRefresh);
    on(SOCKET_EVENTS.ORDER_DELIVERED, handleRefresh);

    return () => {
      off(SOCKET_EVENTS.ORDER_CREATED, handleRefresh);
      off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleRefresh);
      off(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleRefresh);
      off(SOCKET_EVENTS.ORDER_DELIVERED, handleRefresh);
    };
  }, [on, off]);

  const handleAdvanceStatus = async (orderId: string, nextStatus: string) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: nextStatus });
      loadQueue();
      setSuccessMessage(`Order status updated to ${nextStatus}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to advance order status:', err);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    try {
      await apiClient.delete(`/orders/${order.id}`);
      setSuccessMessage(`Deleted order ${order.orderToken}`);
      setConfirmDeleteOrder(null);
      loadQueue();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete order');
    }
  };

  // Initialize camera scanner on page
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          'page-qr-reader',
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          false
        );
        scanner.render(
          (text) => {
            handleVerifyCode(text);
          },
          () => {}
        );
      } catch (err) {
        console.warn('Scanner camera init error:', err);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, []);

  const handleVerifyCode = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data } = await apiClient.post('/qr/verify', {
        verificationCode: code.trim(),
      });
      setScannedOrder(data.data.order);
      setSuccessMessage(data.message || `Order #${data.data.order.orderToken} verified & marked as DELIVERED!`);
      setVerificationCode('');
      loadQueue();
      loadDeliveredHistory();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Invalid QR Code or order already verified/delivered.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverOrder = async () => {
    if (!scannedOrder) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post(`/orders/${scannedOrder.id}/deliver`);
      setScannedOrder(data.data);
      setSuccessMessage(`Order ${data.data.orderToken} marked as DELIVERED!`);
      loadQueue();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark order as delivered.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCashCollected = async () => {
    if (!scannedOrder) return;
    setCashCollecting(true);
    setError(null);
    try {
      await apiClient.post(`/payments/cash-paid/${scannedOrder.id}`);
      setScannedOrder((prev) =>
        prev
          ? {
              ...prev,
              payment: {
                ...(prev.payment || ({} as any)),
                status: 'PAID',
                paymentMethod: 'CASH_ON_DELIVERY',
              },
            }
          : null
      );
      setSuccessMessage(`Cash of ₹${scannedOrder.totalAmount.toFixed(0)} received and order marked as PAID!`);
      loadQueue();
      loadDeliveredHistory();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record cash payment');
    } finally {
      setCashCollecting(false);
    }
  };

  // Filter Delivered Orders History
  const filteredDeliveredHistory = deliveredHistory.filter((ord) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase().trim();
    return (
      ord.orderToken.toLowerCase().includes(q) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
      (ord.customerPhone && ord.customerPhone.toLowerCase().includes(q))
    );
  });

  // Filter Queue Orders (<= 5 mins remaining)
  const canDeliverSoonOrders = queueOrders.filter(
    (o) => o.minutesRemaining !== undefined && o.minutesRemaining <= 5
  );

  const regularQueueOrders = queueOrders.filter(
    (o) => o.minutesRemaining === undefined || o.minutesRemaining > 5
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-brand-400" />
            QR Verification & Order Pickup Dispatch
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan customer's pickup QR code with device camera or enter verification code
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-6">
        {/* Left Column: Camera Scanner & Inputs */}
        <div className="md:col-span-6 space-y-4">
          <div className="glass-card p-5 bg-slate-900 border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Camera QR Reader
            </h3>
            <div
              id="page-qr-reader"
              className="w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800"
            />
          </div>

          {/* Manual Verification Code Input */}
          <div className="glass-card p-5 bg-slate-900 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Enter Verification Code:
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyCode(verificationCode);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="e.g. VERIFY-12345678-ABCDEF"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="glass-input text-xs py-2 font-mono"
              />
              <button
                type="submit"
                disabled={loading || !verificationCode.trim()}
                className="btn-primary text-xs px-4 flex-shrink-0"
              >
                Verify QR
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Verified Order Details & Payment Status Display */}
        <div className="md:col-span-6 space-y-4">
          {scannedOrder && (() => {
            const isCashOnDelivery =
              scannedOrder.paymentMethod === 'CASH_ON_DELIVERY' ||
              scannedOrder.payment?.paymentMethod === 'CASH_ON_DELIVERY';
            const isPaid = scannedOrder.payment?.status === 'PAID' && !isCashOnDelivery;
            const isCashUnpaid = isCashOnDelivery && scannedOrder.payment?.status !== 'PAID';

            // GREEN background if Paid via UPI, RED background if Cash on Delivery (Unpaid)
            return (
              <div
                className={`p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden animate-fade-in border-2 ${
                  isCashUnpaid
                    ? 'bg-gradient-to-br from-rose-950 via-slate-950 to-rose-900 border-rose-500 shadow-rose-500/30 text-white'
                    : 'bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-900 border-emerald-500 shadow-emerald-500/30 text-white'
                }`}
              >
                {/* Prominent Header Status Alert Banner */}
                {isCashUnpaid ? (
                  <div className="p-4 rounded-2xl bg-rose-500/25 border-2 border-rose-500 text-white flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/30 flex items-center justify-center text-rose-300 flex-shrink-0 animate-pulse">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block uppercase text-[10px] tracking-wider text-rose-300 font-extrabold">
                          ⚠️ Cash Payment Required
                        </span>
                        <h4 className="text-base font-black text-white">
                          CASH ON DELIVERY — COLLECT ₹{scannedOrder.totalAmount.toFixed(0)} CASH!
                        </h4>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-rose-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
                      UNPAID
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-500/25 border-2 border-emerald-500 text-white flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block uppercase text-[10px] tracking-wider text-emerald-300 font-extrabold">
                          Payment Verified Online
                        </span>
                        <h4 className="text-base font-black text-white">
                          PAID VIA UPI — NO CASH TO COLLECT!
                        </h4>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
                      PAID ✅
                    </span>
                  </div>
                )}

                {/* Token Number & Verification Stamp */}
                <div className="flex items-center justify-between pb-3 border-b border-white/15">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-300 tracking-wider block">
                      Customer Token Number
                    </span>
                    <h2 className={`text-4xl font-mono font-black tracking-tight ${isCashUnpaid ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {scannedOrder.orderToken}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full border shadow-sm ${
                        isCashUnpaid
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isCashUnpaid ? 'TOKEN VERIFIED (UNPAID)' : 'DELIVERED & QR USED'}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {scannedOrder.deliveredAt ? new Date(scannedOrder.deliveredAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Customer Info & Payment Mode Breakdown */}
                <div className={`p-3.5 rounded-2xl text-xs space-y-1.5 border ${isCashUnpaid ? 'bg-rose-950/60 border-rose-500/30' : 'bg-emerald-950/60 border-emerald-500/30'}`}>
                  <div className="flex justify-between text-slate-200">
                    <span className="text-slate-400">Customer:</span>
                    <strong className="text-white">
                      {scannedOrder.customerName || 'Customer'} ({scannedOrder.customerPhone || 'Counter Pickup'})
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-200">
                    <span className="text-slate-400">Payment Mode:</span>
                    <span className={`font-black ${isCashUnpaid ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isCashOnDelivery ? 'Cash on Delivery (Pay at Counter)' : 'UPI (Google Pay / PhonePe / Paytm)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-200">
                    <span className="text-slate-400">Payment Status:</span>
                    <strong className={`font-black ${isCashUnpaid ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                      {isCashUnpaid ? `UNPAID — Collect ₹${scannedOrder.totalAmount.toFixed(0)} Cash` : 'PAID IN FULL ✅'}
                    </strong>
                  </div>
                  {scannedOrder.payment?.transactionId && !isCashOnDelivery && (
                    <div className="flex justify-between text-slate-200 pt-1 border-t border-emerald-500/20">
                      <span className="text-slate-400">UPI Ref / UTR No:</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {scannedOrder.payment.transactionId}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ordered Food Items Bill Receipt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-white/15">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className={`w-4 h-4 ${isCashUnpaid ? 'text-rose-400' : 'text-emerald-400'}`} />
                      Food Items Ordered by Customer:
                    </span>
                    <span className="text-[11px] font-mono text-slate-300 font-bold">
                      #{scannedOrder.orderToken}
                    </span>
                  </div>

                  <div className={`divide-y rounded-2xl border overflow-hidden ${isCashUnpaid ? 'divide-rose-900/50 bg-slate-950/90 border-rose-500/30' : 'divide-emerald-900/50 bg-slate-950/90 border-emerald-500/30'}`}>
                    {/* Table Header */}
                    <div className={`grid grid-cols-12 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider ${isCashUnpaid ? 'bg-rose-950/80 text-rose-300' : 'bg-emerald-950/80 text-emerald-300'}`}>
                      <div className="col-span-6">Food Item</div>
                      <div className="col-span-2 text-center">Qty</div>
                      <div className="col-span-2 text-right">Unit Price</div>
                      <div className="col-span-2 text-right">Line Total</div>
                    </div>

                    {scannedOrder.items?.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 px-3.5 py-2.5 items-center text-xs text-slate-200"
                      >
                        <div className="col-span-6 font-bold text-white truncate">
                          {item.foodName}
                        </div>
                        <div className={`col-span-2 text-center font-mono font-black ${isCashUnpaid ? 'text-rose-400' : 'text-emerald-400'}`}>
                          × {item.quantity}
                        </div>
                        <div className="col-span-2 text-right font-mono text-slate-400">
                          ₹{(item.totalPrice / (item.quantity || 1)).toFixed(0)}
                        </div>
                        <div className="col-span-2 text-right font-mono font-bold text-white">
                          ₹{item.totalPrice.toFixed(0)}
                        </div>
                      </div>
                    ))}

                    {/* Bill Total */}
                    <div className={`px-3.5 py-3 border-t flex justify-between items-center text-sm ${isCashUnpaid ? 'bg-rose-950/70 border-rose-800/60' : 'bg-emerald-950/70 border-emerald-800/60'}`}>
                      <span className="font-bold text-slate-200">
                        {isCashUnpaid ? 'Total Cash to Collect:' : 'Total Amount Paid:'}
                      </span>
                      <span className={`text-2xl font-mono font-black ${isCashUnpaid ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ₹{scannedOrder.totalAmount.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manager Action Buttons */}
                <div className="space-y-2 pt-1">
                  {isCashUnpaid && (
                    <button
                      type="button"
                      onClick={handleConfirmCashCollected}
                      disabled={cashCollecting}
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {cashCollecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Recording Cash Collection...</span>
                        </>
                      ) : (
                        <>
                          <Banknote className="w-4 h-4" />
                          <span>Confirm ₹{scannedOrder.totalAmount.toFixed(0)} Cash Received & Mark Paid</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setScannedOrder(null)}
                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition"
                  >
                    <span>Ready to Scan Next Customer QR</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Smart Order Queue & Kitchen Dispatch Section */}
      <div className="space-y-6 pt-6 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold text-slate-100">
                Smart Order Queue & Kitchen Dispatch
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-bold">
                {queueOrders.length} active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Auto-prioritized by requested order time and customer arrival
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={loadQueue}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin text-brand-400' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {queueLoading ? (
          <LoadingSkeleton count={3} />
        ) : queueOrders.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All Caught Up!"
            description="There are currently no active orders in the kitchen queue. New customer orders will appear here automatically."
          />
        ) : (
          <div className="space-y-6">
            {/* 1. CAN DELIVER SOON SECTION */}
            {canDeliverSoonOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Can Deliver Soon ({canDeliverSoonOrders.length})
                  </h3>
                  <span className="text-xs text-slate-400">
                    Ready or arriving in &lt; 5 minutes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {canDeliverSoonOrders.map((order) => (
                    <SmartQueueCard
                      key={order.id}
                      order={order}
                      onAdvanceStatus={handleAdvanceStatus}
                      onDeleteOrder={(ord) => setConfirmDeleteOrder(ord)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. REGULAR INCOMING QUEUE SECTION */}
            {regularQueueOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Scheduled & Kitchen Prep Queue ({regularQueueOrders.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regularQueueOrders.map((order) => (
                    <SmartQueueCard
                      key={order.id}
                      order={order}
                      onAdvanceStatus={handleAdvanceStatus}
                      onDeleteOrder={(ord) => setConfirmDeleteOrder(ord)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. DELIVERED ORDERS & TOKEN HISTORY (DISPATCH LOG) */}
      <div className="glass-card p-6 bg-slate-900/90 border-slate-800 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Delivered Orders & Token History
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {deliveredHistory.length} Delivered
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live audit history of QR-verified and collected food orders with token numbers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search token # or customer..."
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-48 sm:w-64"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={loadDeliveredHistory}
              disabled={historyLoading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
              title="Refresh Delivered History"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin text-brand-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {historyLoading && deliveredHistory.length === 0 ? (
          <LoadingSkeleton count={2} />
        ) : filteredDeliveredHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs space-y-1">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-300">No Delivered Orders Found</p>
            <p className="text-[11px] text-slate-500">
              When customers present their QR code and it is scanned, verified tokens and supplied meals will be recorded here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredDeliveredHistory.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/40 transition-all space-y-3 relative overflow-hidden group shadow-md"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Token</span>
                    <span className="font-mono text-sm font-black text-brand-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      {order.orderToken}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    DELIVERED & USED
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                      {order.customerName || 'Customer'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Delivered At:</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Amount & Pay:</span>
                    <span className="text-emerald-400 font-bold">
                      ₹{order.totalAmount.toFixed(0)} • {order.payment?.paymentMethod || 'UPI'}
                    </span>
                  </div>
                </div>

                {/* Items supplied summary */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Supplied Items:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {order.items?.map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                      >
                        <strong className="text-brand-400">{item.quantity}×</strong> {item.foodName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-md bg-slate-900 border-rose-500/40 p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 pb-2 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Delete Queue Order?</h3>
                <p className="text-xs text-slate-400">Permanently delete this order from kitchen queue</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Token:</span>
                <span className="font-mono font-bold text-brand-400">{confirmDeleteOrder.orderToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-200">{confirmDeleteOrder.customerName}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteOrder(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOrder(confirmDeleteOrder)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-glow"
              >
                Yes, Delete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

