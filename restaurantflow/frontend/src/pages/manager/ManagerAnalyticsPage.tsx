import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  PieChart as PieIcon, 
  CreditCard,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiClient } from '../../api/client';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

export const ManagerAnalyticsPage: React.FC = () => {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();

  const [data, setData] = useState<{
    kpis: any;
    charts: {
      dailyRevenue: { date: string; revenue: number; orders: number }[];
      hourlyOrders: { hour: string; count: number }[];
      topFoods: { name: string; quantity: number; sales: number }[];
      paymentDistribution: { method: string; count: number; amount: number }[];
    };
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/analytics/dashboard');
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [restaurantId]);

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (loading || !data) {
    return <LoadingSkeleton count={4} />;
  }

  const { kpis, charts } = data;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-400" />
            Live Analytics & Revenue Performance
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Key restaurant metrics, hourly rush-hour distribution, top-selling dishes and revenue trends
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-brand-400 mb-2">
            <span className="text-xs font-semibold">Today's Revenue</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-white">
            ₹{kpis.todayRevenue.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Verified paid revenue</span>
        </div>

        <div className="glass-card p-5 bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-sky-400 mb-2">
            <span className="text-xs font-semibold">Monthly Revenue</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-white">
            ₹{kpis.monthlyRevenue.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Current calendar month</span>
        </div>

        <div className="glass-card p-5 bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold">Average Order Value</span>
            <ShoppingBag className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-white">
            ₹{kpis.avgOrderValue.toFixed(0)}
          </p>
          <span className="text-[10px] text-slate-400">Average ticket size</span>
        </div>

        <div className="glass-card p-5 bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold">Completed Orders</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-white">{kpis.deliveredOrders}</p>
          <span className="text-[10px] text-slate-400">Successfully delivered</span>
        </div>
      </div>

      {/* Charts Row 1: Daily Revenue Trend & Hourly Orders */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Daily Revenue Area Chart */}
        <div className="lg:col-span-7 glass-card p-6 bg-slate-900/90 border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Revenue Trend (Last 7 Days)</h3>
              <p className="text-xs text-slate-400">Daily gross revenue in Rupees (₹)</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.dailyRevenue}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                  name="Revenue (₹)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Rush Distribution */}
        <div className="lg:col-span-5 glass-card p-6 bg-slate-900/90 border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Hourly Rush-Hour Trend
            </h3>
            <p className="text-xs text-slate-400">Order count by hour of day</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.hourlyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Top Selling Foods & Payment Distribution */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Top Selling Foods */}
        <div className="lg:col-span-7 glass-card p-6 bg-slate-900/90 border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Top Selling Food Items</h3>
            <p className="text-xs text-slate-400">Ranked by units sold</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topFoods} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748b"
                  fontSize={11}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="quantity" fill="#10b981" radius={[0, 6, 6, 0]} name="Units Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Donut */}
        <div className="lg:col-span-5 glass-card p-6 bg-slate-900/90 border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-brand-400" />
              Payment Method Breakdown
            </h3>
            <p className="text-xs text-slate-400">UPI vs Card vs Cash on Delivery</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {charts.paymentDistribution.length === 0 ? (
              <p className="text-xs text-slate-400">No payment data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.paymentDistribution}
                    dataKey="count"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {charts.paymentDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
