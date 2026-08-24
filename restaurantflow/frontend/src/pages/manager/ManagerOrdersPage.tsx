import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ListOrdered, 
  Search, 
  Filter, 
  Banknote, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Trash2,
  AlertTriangle,
  Calendar,
  CheckSquare,
  Square,
  RefreshCw,
  X,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Order, OrderStatus } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { EmptyState } from '../../components/EmptyState';

export const ManagerOrdersPage: React.FC = () => {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Multi-select & Bulk Delete State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Clear History Modal State
  const [clearHistoryModalOpen, setClearHistoryModalOpen] = useState(false);
  const [clearScope, setClearScope] = useState<'today' | 'all' | 'finished'>('today');
  const [clearDate, setClearDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clearLoading, setClearLoading] = useState(false);

  // Delete Confirmation Dialog for single order
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<Order | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = `/orders?page=${page}&limit=15&restaurantId=${restaurantId}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;

      const { data } = await apiClient.get(query);
      setOrders(data.data || []);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
      setSelectedOrderIds([]);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter, restaurantId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setActionLoading(true);
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      showToast(`Order status updated to ${newStatus}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCashPaid = async (orderId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/payments/cash-paid/${orderId}`);
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                payment: prev.payment ? { ...prev.payment, status: 'PAID' } : undefined,
              }
            : null
        );
      }
      showToast('Cash payment recorded successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record cash payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Individual Order
  const handleDeleteSingleOrder = async (order: Order) => {
    setDeletingId(order.id);
    try {
      await apiClient.delete(`/orders/${order.id}`);
      showToast(`Deleted order ${order.orderToken}`);
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }
      setConfirmDeleteOrder(null);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setDeletingId(null);
    }
  };

  // Delete Selected Orders (Bulk)
  const handleDeleteSelected = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedOrderIds.length} selected order(s)?`)) return;

    setActionLoading(true);
    try {
      const { data } = await apiClient.post('/orders/bulk-delete', {
        restaurantId,
        orderIds: selectedOrderIds,
      });
      showToast(`Deleted ${data.data?.deletedCount || selectedOrderIds.length} orders`);
      setSelectedOrderIds([]);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete selected orders');
    } finally {
      setActionLoading(false);
    }
  };

  // Clear History (Today / Date / Scope)
  const handleClearHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClearLoading(true);

    try {
      let url = `/orders/clear-history?restaurantId=${restaurantId}`;
      if (clearScope === 'today') {
        url += '&date=today';
      } else if (clearScope === 'finished') {
        url += '&status=DELIVERED';
      } else {
        url += `&date=${clearDate}`;
      }

      const { data } = await apiClient.delete(url);
      showToast(`Cleared ${data.data?.deletedCount || 0} order history records`);
      setClearHistoryModalOpen(false);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clear history');
    } finally {
      setClearLoading(false);
    }
  };

  // Toggle selection
  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  const statusOptions = ['ALL', 'PREPARING', 'DELIVERED'];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <ListOrdered className="w-7 h-7 text-brand-400" />
            Order Management & History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track real-time orders, manage status transitions, and clear order history with granular controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start">
          {/* Refresh Button */}
          <button
            onClick={() => loadOrders()}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Refresh Orders"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {/* Delete Selected Button (Active when orders selected) */}
          {selectedOrderIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={actionLoading}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-glow"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedOrderIds.length})</span>
            </button>
          )}

          {/* Clear Day History Button */}
          <button
            onClick={() => setClearHistoryModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History of the Day</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-card p-4 bg-slate-900/90 border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {statusOptions.map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'btn-primary'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search token, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-9 text-xs py-2"
            />
          </div>
          <button type="submit" className="btn-secondary text-xs py-2 px-3">
            Search
          </button>
        </form>
      </div>

      {/* Orders Table */}
      {loading ? (
        <LoadingSkeleton count={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="No Orders Found"
          description="There are no orders matching your current filters or date range."
          actionText="Reset Filters"
          onAction={() => {
            setStatusFilter('ALL');
            setSearch('');
            setPage(1);
          }}
        />
      ) : (
        <div className="glass-card bg-slate-900/90 border-slate-800 overflow-hidden rounded-2xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-slate-200 transition"
                      title={selectedOrderIds.length === orders.length ? 'Deselect All' : 'Select All'}
                    >
                      {selectedOrderIds.length > 0 && selectedOrderIds.length === orders.length ? (
                        <CheckSquare className="w-4 h-4 text-brand-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Token</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Time Placed</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {orders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-800/40 transition ${isSelected ? 'bg-brand-500/10' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          className="text-slate-400 hover:text-slate-200 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Token */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-brand-400">
                        {order.orderToken}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-200">
                          {order.customerName || 'Customer'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{order.customerPhone}</div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 max-w-[200px] truncate">
                        {order.items?.map((it) => `${it.foodName} (×${it.quantity})`).join(', ')}
                      </td>

                      {/* Timing */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 font-extrabold text-white font-mono">
                        ₹{order.totalAmount.toFixed(0)}
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <StatusBadge status={order.payment?.status || 'PAID'} size="sm" />
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">
                            {order.payment?.paymentMethod || 'UPI'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={order.status} size="sm" />
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* COD Collect Cash Button */}
                        {order.payment?.paymentMethod === 'CASH_ON_DELIVERY' &&
                          order.payment.status === 'UNPAID' && (
                            <button
                              onClick={() => handleMarkCashPaid(order.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition"
                              title="Collect cash from customer"
                            >
                              <Banknote className="w-3.5 h-3.5 inline mr-1" />
                              Collect ₹{order.totalAmount.toFixed(0)}
                            </button>
                          )}

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" /> View
                        </button>

                        {/* Delete Order Button */}
                        <button
                          onClick={() => setConfirmDeleteOrder(order)}
                          className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[11px] font-semibold transition"
                          title="Delete this order"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {orders.length} of {total} orders (Page {page} of {totalPages})
              {selectedOrderIds.length > 0 && ` • ${selectedOrderIds.length} selected`}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-200">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Order Confirmation Modal */}
      {confirmDeleteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-md bg-slate-900 border-rose-500/40 p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 pb-2 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Delete Order?</h3>
                <p className="text-xs text-slate-400">This action will remove the order permanently</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Order Token:</span>
                <span className="font-mono font-bold text-brand-400">{confirmDeleteOrder.orderToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-200">{confirmDeleteOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-white">₹{confirmDeleteOrder.totalAmount.toFixed(0)}</span>
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
                onClick={() => handleDeleteSingleOrder(confirmDeleteOrder)}
                disabled={deletingId === confirmDeleteOrder.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-glow"
              >
                {deletingId === confirmDeleteOrder.id ? 'Deleting...' : 'Yes, Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear History Modal */}
      {clearHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-lg bg-slate-900 border-slate-700 p-6 rounded-3xl space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Clear Order History</h3>
                  <p className="text-xs text-slate-400">Remove order records for the day or specific period</p>
                </div>
              </div>
              <button
                onClick={() => setClearHistoryModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClearHistorySubmit} className="space-y-4">
              {/* Option Radios */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Scope to Clear:
                </label>

                <div
                  onClick={() => setClearScope('today')}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                    clearScope === 'today'
                      ? 'bg-rose-500/10 border-rose-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Clear Today's Orders</div>
                      <div className="text-[11px] text-slate-400">Deletes all orders created today ({new Date().toLocaleDateString()})</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${clearScope === 'today' ? 'border-rose-500 bg-rose-500' : 'border-slate-700'}`}>
                    {clearScope === 'today' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>

                <div
                  onClick={() => setClearScope('finished')}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                    clearScope === 'finished'
                      ? 'bg-rose-500/10 border-rose-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Clear Delivered & Completed Orders</div>
                      <div className="text-[11px] text-slate-400">Keeps active kitchen orders, only deletes completed ones</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${clearScope === 'finished' ? 'border-rose-500 bg-rose-500' : 'border-slate-700'}`}>
                    {clearScope === 'finished' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>

                <div
                  onClick={() => setClearScope('all')}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                    clearScope === 'all'
                      ? 'bg-rose-500/10 border-rose-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Clear By Specific Date</div>
                      <div className="text-[11px] text-slate-400">Choose a specific calendar date to purge</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${clearScope === 'all' ? 'border-rose-500 bg-rose-500' : 'border-slate-700'}`}>
                    {clearScope === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>

              {clearScope === 'all' && (
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Date:</label>
                  <input
                    type="date"
                    value={clearDate}
                    onChange={(e) => setClearDate(e.target.value)}
                    className="glass-input text-xs py-2"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>Deleted orders and linked receipt/payment entries cannot be recovered.</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setClearHistoryModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clearLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-glow flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{clearLoading ? 'Clearing History...' : 'Confirm Clear History'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg bg-slate-900 border-slate-700 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Order Token</span>
                <h3 className="text-xl font-mono font-extrabold text-brand-400">
                  {selectedOrder.orderToken}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-400">Customer:</span>
                <p className="font-bold text-slate-200">{selectedOrder.customerName}</p>
                <p className="text-slate-400">{selectedOrder.customerPhone}</p>
              </div>
              <div>
                <span className="text-slate-400">Target Preparation Time:</span>
                <p className="font-bold text-amber-300">
                  {new Date(selectedOrder.requestedFoodAt).toLocaleTimeString()}
                </p>
                <p className="text-slate-400">{selectedOrder.preferredTimeType}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-400">Order Items:</span>
              {selectedOrder.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-slate-300">
                  <span>
                    {item.foodName} <strong className="text-brand-400">× {item.quantity}</strong>
                  </span>
                  <span>₹{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-extrabold text-white">
              <span>Total Bill</span>
              <span className="text-brand-400">₹{selectedOrder.totalAmount.toFixed(2)}</span>
            </div>

            {/* State Actions & Delete Option */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {selectedOrder.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                    disabled={actionLoading}
                    className="btn-primary text-xs py-2 px-3 bg-amber-600 hover:bg-amber-500"
                  >
                    Start Preparing
                  </button>
                )}
                {selectedOrder.status === 'PREPARING' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'READY')}
                    disabled={actionLoading}
                    className="btn-primary text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-500"
                  >
                    Mark as READY
                  </button>
                )}
                {selectedOrder.status === 'READY' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                    disabled={actionLoading}
                    className="btn-primary text-xs py-2 px-3 shadow-glow"
                  >
                    Mark as DELIVERED
                  </button>
                )}
                {['CONFIRMED', 'PREPARING'].includes(selectedOrder.status) && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                    disabled={actionLoading}
                    className="btn-danger text-xs py-2 px-3"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setConfirmDeleteOrder(selectedOrder);
                }}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5"
                title="Delete this order record"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
