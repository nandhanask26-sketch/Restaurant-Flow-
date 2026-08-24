import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  IndianRupee, 
  Power, 
  RefreshCw, 
  Calendar, 
  TrendingUp, 
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  PackageCheck,
  Building2
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../../../backend/src/websocket/socketEvents';

interface MonthlyHistoryItem {
  monthKey: string;
  monthLabel: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number;
  avgOrderValue: number;
}

export const ManagerDashboard: React.FC = () => {
  const { restaurantId, restaurantStatus, restaurantName, setRestaurantStatus } =
    useOutletContext<{
      restaurantId: string;
      restaurantStatus: boolean;
      restaurantName: string;
      setRestaurantStatus: (val: boolean) => void;
    }>();

  const [kpis, setKpis] = useState({
    todayOrders: 0,
    allTimeOrders: 0,
    waitingOrdersToDeliver: 0,
    deliveredOrdersToday: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    avgOrderValue: 0,
  });

  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusToggling, setStatusToggling] = useState(false);

  const { on, off } = useSocket(restaurantId);

  const loadDashboard = async (isManual = false) => {
    if (!restaurantId) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await apiClient.get('/analytics/dashboard');
      if (data.data?.kpis) {
        setKpis(data.data.kpis);
      }
      if (data.data?.monthlyHistory) {
        setMonthlyHistory(data.data.monthlyHistory);
      }
    } catch (err) {
      console.error('Failed to load manager dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [restaurantId]);

  // Real-time socket events for new orders, status shifts, payments
  useEffect(() => {
    const handleRefresh = () => {
      loadDashboard(true);
    };

    on(SOCKET_EVENTS.ORDER_CREATED, handleRefresh);
    on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleRefresh);
    on(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleRefresh);

    return () => {
      off(SOCKET_EVENTS.ORDER_CREATED, handleRefresh);
      off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleRefresh);
      off(SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, handleRefresh);
    };
  }, [on, off]);

  const handleToggleStatus = async () => {
    if (!restaurantId || statusToggling) return;
    setStatusToggling(true);
    const newStatus = !restaurantStatus;

    try {
      await apiClient.patch(`/restaurants/${restaurantId}/status`, {
        isOpen: newStatus,
      });
      setRestaurantStatus(newStatus);
    } catch (err) {
      console.error('Failed to toggle restaurant status:', err);
    } finally {
      setStatusToggling(false);
    }
  };

  // Find maximum revenue month for visual progress scaling
  const maxMonthlyRevenue = Math.max(...monthlyHistory.map((m) => m.revenue), 1);

  return (
    <div className="space-y-7 animate-fade-in pb-16">
      {/* 1. Header & Restaurant Status Controller */}
      <div className="glass-card p-6 bg-slate-900/90 border-slate-800 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                {restaurantName || 'Spice Garden'}
              </h1>
              <span className="badge-blue text-[10px]">Manager Portal</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational overview & monthly revenue analytics
            </p>
          </div>
        </div>

        {/* Restaurant Status Open/Close Switch Panel */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Restaurant Status
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  restaurantStatus ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span
                className={`text-xs font-black ${
                  restaurantStatus ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {restaurantStatus ? 'OPEN (Accepting Orders)' : 'CLOSED (Orders Paused)'}
              </span>
            </div>
          </div>

          <button
            onClick={handleToggleStatus}
            disabled={statusToggling}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition shadow-lg ${
              restaurantStatus
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{statusToggling ? 'Updating...' : restaurantStatus ? 'Close Restaurant' : 'Open Restaurant'}</span>
          </button>

          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Core 4 Metrics KPI Cards */}
      {loading ? (
        <LoadingSkeleton count={2} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Today's Total Order */}
          <div className="glass-card p-5 bg-slate-900/90 border-slate-800 rounded-3xl relative overflow-hidden group hover:border-brand-500/40 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Today's Total Order</span>
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{kpis.todayOrders}</div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              <span>Orders today</span>
              <span className="font-semibold text-slate-300 font-mono">All-time: {kpis.allTimeOrders}</span>
            </div>
          </div>

          {/* 2. Waiting to Deliver */}
          <Link
            to="/manager/smart-queue"
            className="glass-card p-5 bg-slate-900/90 border-amber-500/30 rounded-3xl relative overflow-hidden group hover:border-amber-400 transition block"
          >
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Waiting to Deliver
              </span>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-400">
              {kpis.waitingOrdersToDeliver}
            </div>
            <div className="flex items-center justify-between text-[11px] text-amber-400/80 mt-2 pt-2 border-t border-slate-800/80">
              <span>Pending kitchen / pickup</span>
              <span className="flex items-center gap-0.5 font-bold group-hover:underline">
                View Queue <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* 3. Delivered Order */}
          <div className="glass-card p-5 bg-slate-900/90 border-sky-500/30 rounded-3xl relative overflow-hidden group hover:border-sky-400 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Delivered Order
              </span>
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-sky-400">
              {kpis.deliveredOrdersToday}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              <span>Completed today</span>
              <span className="font-semibold text-sky-300">
                {kpis.todayOrders > 0
                  ? `${Math.round((kpis.deliveredOrdersToday / kpis.todayOrders) * 100)}% Rate`
                  : '100%'}
              </span>
            </div>
          </div>

          {/* 4. Today's Revenue */}
          <div className="glass-card p-5 bg-gradient-to-br from-emerald-950/30 to-slate-900/90 border-emerald-500/30 rounded-3xl relative overflow-hidden group hover:border-emerald-400/50 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Today's Revenue
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              ₹{kpis.todayRevenue.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              <span>Paid collections</span>
              <span className="font-semibold text-emerald-400 font-mono">
                Live today
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. History of Orders Per Month and its Revenue */}
      <div className="glass-card p-6 bg-slate-900/90 border-slate-800 rounded-3xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-extrabold text-slate-100">
                Monthly Order History & Revenue
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical breakdown of total order volumes, delivered counts, and monthly revenue earnings
            </p>
          </div>

          <div className="text-xs text-slate-400 font-medium self-start">
            Showing <strong className="text-slate-200">{monthlyHistory.length}</strong> month(s) of history
          </div>
        </div>

        {monthlyHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
            No historical monthly orders recorded yet. As orders are received and delivered, monthly summaries will populate automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Month & Year</th>
                  <th className="py-3.5 px-4">Total Orders</th>
                  <th className="py-3.5 px-4">Delivered Orders</th>
                  <th className="py-3.5 px-4">Cancelled</th>
                  <th className="py-3.5 px-4">Monthly Revenue</th>
                  <th className="py-3.5 px-4 text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {monthlyHistory.map((item) => {
                  const percentage = Math.round((item.revenue / maxMonthlyRevenue) * 100);
                  const deliveryRate =
                    item.totalOrders > 0
                      ? Math.round((item.deliveredOrders / item.totalOrders) * 100)
                      : 0;

                  return (
                    <tr key={item.monthKey} className="hover:bg-slate-800/40 transition">
                      {/* Month Label */}
                      <td className="py-4 px-4 font-bold text-slate-100 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-brand-400" />
                          <span>{item.monthLabel}</span>
                        </div>
                      </td>

                      {/* Total Orders */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-200">
                        {item.totalOrders} orders
                      </td>

                      {/* Delivered Orders */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">
                            {item.deliveredOrders}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                            {deliveryRate}%
                          </span>
                        </div>
                      </td>

                      {/* Cancelled */}
                      <td className="py-4 px-4 font-mono text-slate-400">
                        {item.cancelledOrders}
                      </td>

                      {/* Monthly Revenue */}
                      <td className="py-4 px-4">
                        <span className="text-sm font-extrabold text-emerald-400 font-mono">
                          ₹{item.revenue.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Visual Bar */}
                      <td className="py-4 px-4 text-right">
                        <div className="w-28 ml-auto space-y-1">
                          <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {percentage}% peak
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
