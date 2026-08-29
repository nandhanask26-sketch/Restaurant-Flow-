import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Clock, 
  IndianRupee, 
  Power, 
  RefreshCw, 
  Calendar, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Building2,
  CalendarDays,
  Coins
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../types/socketEvents';
import { MonthlyHistoryItem } from '../../types';

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
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
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
        // Automatically expand the current/first month by default
        if (data.data.monthlyHistory.length > 0) {
          setExpandedMonths(new Set([data.data.monthlyHistory[0].monthKey]));
        }
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

  const toggleMonthExpand = (monthKey: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  // Find maximum revenue month for visual progress scaling
  const maxMonthlyRevenue = Math.max(...monthlyHistory.map((m) => m.revenue), 1);

  return (
    <div className="space-y-7 animate-fade-in pb-16">
      {/* 1. Header */}
      <div className="glass-card p-6 bg-slate-900/90 border-slate-800 rounded-3xl shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                {restaurantName || 'Spice Garden'}
              </h1>
              <span className="badge-blue text-[10px]">Dashboard</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational overview, daily order queues & revenue history
            </p>
          </div>
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
          <div className="glass-card p-5 bg-slate-900/90 border-emerald-500/30 rounded-3xl relative overflow-hidden group hover:border-emerald-400/50 transition">
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

      {/* 3. REVENUE HISTORY: Interactive Collective & Day-by-Day Dropdown */}
      <div className="glass-card p-6 bg-slate-900/90 border-slate-800 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Coins className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-100">
                Revenue History
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Monthly overview with interactive day-by-day revenue dropdowns (dates, day of the week, and orders)
            </p>
          </div>

          <div className="text-xs text-slate-400 font-medium self-start sm:self-auto flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <CalendarDays className="w-3.5 h-3.5 text-brand-400" />
            <span>Showing <strong className="text-slate-200">{monthlyHistory.length}</strong> month(s)</span>
          </div>
        </div>

        {monthlyHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
            No historical revenue recorded yet. As orders are placed and paid, daily and monthly summaries will populate automatically.
          </div>
        ) : (
          <div className="space-y-4">
            {monthlyHistory.map((item) => {
              const isExpanded = expandedMonths.has(item.monthKey);
              const percentage = Math.round((item.revenue / maxMonthlyRevenue) * 100);
              const deliveryRate =
                item.totalOrders > 0
                  ? Math.round((item.deliveredOrders / item.totalOrders) * 100)
                  : 0;

              return (
                <div
                  key={item.monthKey}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-lg transition-all"
                >
                  {/* Monthly Collective Header Card (Click to Expand / Collapse) */}
                  <div
                    onClick={() => toggleMonthExpand(item.monthKey)}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/70 transition select-none group"
                  >
                    {/* Left: Month title & dropdown trigger */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-brand-400 group-hover:border-brand-500/40 transition">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-brand-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-white">
                            {item.monthLabel}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 border border-brand-500/20 text-brand-400">
                            {item.days?.length || 0} active day(s)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isExpanded
                            ? 'Click to collapse daily breakdown'
                            : 'Click to view day-by-day revenue & order history'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Collective Monthly Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 items-center pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Total Orders
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-slate-200">
                          {item.totalOrders} orders
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Delivered
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
                            {item.deliveredOrders}
                          </span>
                          <span className="text-[10px] text-emerald-300/80 font-medium">
                            ({deliveryRate}%)
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Monthly Revenue
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                          ₹{item.revenue.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="w-24 sm:w-28">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                          <span>Share</span>
                          <span className="font-mono">{percentage}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day-by-Day Dropdown Table Drawer */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/90 p-4 sm:p-5 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-brand-400" />
                          <span>Day-by-Day Revenue Breakdown ({item.monthLabel})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Sorted by latest date
                        </span>
                      </div>

                      {(!item.days || item.days.length === 0) ? (
                        <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/60">
                          No individual daily order entries recorded for this month.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                              <tr>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Day</th>
                                <th className="py-3 px-4">Orders</th>
                                <th className="py-3 px-4">Delivered</th>
                                <th className="py-3 px-4">Cancelled</th>
                                <th className="py-3 px-4">Daily Revenue</th>
                                <th className="py-3 px-4 text-right">Daily Share</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                              {item.days.map((day) => {
                                const dayShare = item.revenue > 0 ? Math.round((day.revenue / item.revenue) * 100) : 0;
                                const dayDeliveryRate = day.totalOrders > 0 ? Math.round((day.deliveredOrders / day.totalOrders) * 100) : 0;

                                return (
                                  <tr key={day.dateStr} className="hover:bg-slate-900/60 transition">
                                    {/* Date */}
                                    <td className="py-3.5 px-4 font-bold text-slate-100 font-mono">
                                      {day.formattedDate || day.dateStr}
                                    </td>

                                    {/* Day of week badge */}
                                    <td className="py-3.5 px-4">
                                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-200 text-[11px] font-semibold">
                                        {day.dayOfWeek}
                                      </span>
                                    </td>

                                    {/* Orders Count */}
                                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                                      {day.totalOrders} order(s)
                                    </td>

                                    {/* Delivered */}
                                    <td className="py-3.5 px-4">
                                      <span className="font-mono font-bold text-emerald-400">
                                        {day.deliveredOrders}
                                      </span>
                                      <span className="text-[10px] text-slate-400 ml-1">
                                        ({dayDeliveryRate}%)
                                      </span>
                                    </td>

                                    {/* Cancelled */}
                                    <td className="py-3.5 px-4 font-mono text-slate-400">
                                      {day.cancelledOrders}
                                    </td>

                                    {/* Daily Revenue */}
                                    <td className="py-3.5 px-4">
                                      <span className="text-sm font-black text-emerald-400 font-mono">
                                        ₹{day.revenue.toLocaleString('en-IN')}
                                      </span>
                                    </td>

                                    {/* Share of monthly total */}
                                    <td className="py-3.5 px-4 text-right">
                                      <div className="inline-flex items-center gap-2">
                                        <div className="w-16 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                                          <div
                                            className="h-full bg-emerald-400 rounded-full"
                                            style={{ width: `${Math.max(dayShare, 8)}%` }}
                                          />
                                        </div>
                                        <span className="font-mono text-[11px] text-slate-400 w-8 text-right">
                                          {dayShare}%
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
