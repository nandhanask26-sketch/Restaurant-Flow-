import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Clock, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  ScanLine, 
  Zap, 
  Sparkles,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Order } from '../../types';
import { SmartQueueCard } from '../../components/SmartQueueCard';
import { QRScannerModal } from '../../components/QRScannerModal';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../types/socketEvents';

export const ManagerSmartQueuePage: React.FC = () => {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { on, off } = useSocket(restaurantId);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadQueue = async () => {
    try {
      const { data } = await apiClient.get('/orders/smart-queue');
      setOrders(data.data || []);
    } catch (err) {
      console.error('Failed to load smart queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // Auto refresh timer every 30s for countdown accuracy
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  useEffect(() => {
    const handleRefresh = () => loadQueue();

    on(SOCKET_EVENTS.ORDER_CREATED, handleRefresh);
    on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleRefresh);
    on(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleRefresh);

    return () => {
      off(SOCKET_EVENTS.ORDER_CREATED, handleRefresh);
      off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleRefresh);
      off(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleRefresh);
    };
  }, [on, off]);

  const handleAdvanceStatus = async (orderId: string, nextStatus: string) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: nextStatus });
      loadQueue();
      showToast(`Order status updated to ${nextStatus}`);
    } catch (err) {
      console.error('Failed to advance order status:', err);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    try {
      await apiClient.delete(`/orders/${order.id}`);
      showToast(`Deleted order ${order.orderToken}`);
      setConfirmDeleteOrder(null);
      loadQueue();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete order');
    }
  };

  // Filter "Can Deliver Soon" orders (READY status or <= 5 mins remaining)
  const canDeliverSoonOrders = orders.filter(
    (o) => o.status === 'READY' || (o.minutesRemaining !== undefined && o.minutesRemaining <= 5)
  );

  const regularQueueOrders = orders.filter(
    (o) => o.status !== 'READY' && (o.minutesRemaining === undefined || o.minutesRemaining > 5)
  );

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce-short">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Quick Scan Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-brand-400" />
            Smart Order Queue & Kitchen Dispatch
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-prioritized by requested preparation time, cook time, and customer arrival
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadQueue}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setScannerOpen(true)}
            className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center gap-2 shadow-glow"
          >
            <ScanLine className="w-4 h-4" />
            Scan & Deliver QR
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All Caught Up!"
          description="There are currently no active orders in the smart kitchen queue. New customer orders will appear automatically."
        />
      ) : (
        <div className="space-y-8">
          {/* 1. CAN DELIVER SOON SECTION */}
          {canDeliverSoonOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                <h2 className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  Can Deliver Soon ({canDeliverSoonOrders.length})
                </h2>
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
                    onOpenQrScanner={() => setScannerOpen(true)}
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
                <h2 className="text-base font-bold text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Scheduled & Kitchen Prep Queue ({regularQueueOrders.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularQueueOrders.map((order) => (
                  <SmartQueueCard
                    key={order.id}
                    order={order}
                    onAdvanceStatus={handleAdvanceStatus}
                    onOpenQrScanner={() => setScannerOpen(true)}
                    onDeleteOrder={(ord) => setConfirmDeleteOrder(ord)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onOrderDelivered={() => loadQueue()}
      />
    </div>
  );
};
