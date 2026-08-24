import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, Clock, QrCode, ChevronRight, ShoppingBag } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Order } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { QRModal } from '../../components/QRModal';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../../../backend/src/websocket/socketEvents';

export const CustomerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQrOrder, setSelectedQrOrder] = useState<Order | null>(null);

  const { on, off } = useSocket();

  const loadOrders = async () => {
    try {
      const { data } = await apiClient.get('/orders?limit=50');
      setOrders(data.data || []);
    } catch (err) {
      console.error('Failed to load customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Listen for live order status updates
  useEffect(() => {
    const handleStatusUpdate = (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );
    };

    on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleStatusUpdate);
    on(SOCKET_EVENTS.ORDER_CREATED, loadOrders);

    return () => {
      off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleStatusUpdate);
      off(SOCKET_EVENTS.ORDER_CREATED, loadOrders);
    };
  }, [on, off]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <ListOrdered className="w-6 h-6 text-brand-400" />
          My Orders & History
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Track active kitchen status, view tokens and open verification QR codes
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No Orders Yet"
          description="You haven't placed any orders yet. Check out today's delicious menu!"
          actionText="Browse Menu"
          onAction={() => (window.location.href = '/customer/menu')}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass-card-hover p-5 bg-slate-900 border-slate-800 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono font-extrabold text-brand-400">
                    {order.orderToken}
                  </span>
                  <StatusBadge status={order.status} size="sm" />
                  <StatusBadge status={order.payment?.status || 'PAID'} size="sm" />
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(order.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Items summary */}
              <div className="space-y-1.5 text-xs text-slate-300">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.foodName} <strong className="text-brand-400">× {item.quantity}</strong>
                    </span>
                    <span>₹{item.totalPrice.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    Pickup Target: <strong className="text-slate-200">{new Date(order.requestedFoodAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    Total: ₹{order.totalAmount.toFixed(0)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedQrOrder(order)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-brand-400 border-brand-500/30 hover:bg-brand-500/10"
                  >
                    <QrCode className="w-4 h-4" />
                    Show QR
                  </button>

                  <Link
                    to={`/customer/orders/${order.id}`}
                    className="btn-primary text-xs py-2 px-3 flex items-center gap-1"
                  >
                    Details <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedQrOrder && (
        <QRModal
          order={selectedQrOrder}
          isOpen={true}
          onClose={() => setSelectedQrOrder(null)}
        />
      )}
    </div>
  );
};
