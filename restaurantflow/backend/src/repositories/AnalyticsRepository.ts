import { query } from '../config/database';

export interface DayHistoryItem {
  dateStr: string;
  formattedDate: string;
  dayOfWeek: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number;
  avgOrderValue: number;
}

export interface MonthlyHistoryItem {
  monthKey: string;
  monthLabel: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number;
  avgOrderValue: number;
  days: DayHistoryItem[];
}

export class AnalyticsRepository {
  async getDashboardKPIs(restaurantId: string): Promise<{
    todayOrders: number;
    allTimeOrders: number;
    waitingOrdersToDeliver: number;
    waitingOrders: number;
    preparingOrders: number;
    readyOrders: number;
    deliveredOrdersToday: number;
    deliveredOrders: number;
    cancelledOrders: number;
    todayRevenue: number;
    monthlyRevenue: number;
    avgOrderValue: number;
    totalActiveOrders: number;
  }> {
    const sql = `
      SELECT 
        COUNT(CASE WHEN DATE(o.created_at) = CURRENT_DATE THEN 1 END) as today_orders,
        COUNT(o.id) as all_time_orders,
        COUNT(CASE WHEN o.status IN ('CONFIRMED', 'PREPARING', 'READY') THEN 1 END) as waiting_orders_to_deliver,
        COUNT(CASE WHEN o.status = 'CONFIRMED' THEN 1 END) as waiting_orders,
        COUNT(CASE WHEN o.status = 'PREPARING' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN o.status = 'READY' THEN 1 END) as ready_orders,
        COUNT(CASE WHEN o.status = 'DELIVERED' AND DATE(o.created_at) = CURRENT_DATE THEN 1 END) as delivered_orders_today,
        COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN o.status = 'CANCELLED' AND DATE(o.created_at) = CURRENT_DATE THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN p.status = 'PAID' AND DATE(o.created_at) = CURRENT_DATE THEN p.amount ELSE 0 END), 0) as today_revenue,
        COALESCE(SUM(CASE WHEN p.status = 'PAID' AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN p.amount ELSE 0 END), 0) as monthly_revenue,
        COALESCE(AVG(CASE WHEN p.status = 'PAID' AND DATE(o.created_at) = CURRENT_DATE THEN p.amount END), 0) as avg_order_value,
        COUNT(CASE WHEN o.status IN ('CONFIRMED', 'PREPARING', 'READY') THEN 1 END) as total_active_orders
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.restaurant_id = $1;
    `;
    const res = await query(sql, [restaurantId]);
    const r = res.rows[0];

    return {
      todayOrders: parseInt(r.today_orders || '0', 10),
      allTimeOrders: parseInt(r.all_time_orders || '0', 10),
      waitingOrdersToDeliver: parseInt(r.waiting_orders_to_deliver || '0', 10),
      waitingOrders: parseInt(r.waiting_orders || '0', 10),
      preparingOrders: parseInt(r.preparing_orders || '0', 10),
      readyOrders: parseInt(r.ready_orders || '0', 10),
      deliveredOrdersToday: parseInt(r.delivered_orders_today || '0', 10),
      deliveredOrders: parseInt(r.delivered_orders || '0', 10),
      cancelledOrders: parseInt(r.cancelled_orders || '0', 10),
      todayRevenue: parseFloat(r.today_revenue || '0'),
      monthlyRevenue: parseFloat(r.monthly_revenue || '0'),
      avgOrderValue: parseFloat(r.avg_order_value || '0'),
      totalActiveOrders: parseInt(r.total_active_orders || '0', 10),
    };
  }

  async getMonthlyOrderHistory(restaurantId: string): Promise<MonthlyHistoryItem[]> {
    const monthlySql = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') as month_key,
        TO_CHAR(DATE_TRUNC('month', o.created_at), 'FMMonth YYYY') as month_label,
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) as revenue,
        COALESCE(AVG(CASE WHEN p.status = 'PAID' THEN p.amount END), 0) as avg_order_value
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.restaurant_id = $1
      GROUP BY DATE_TRUNC('month', o.created_at)
      ORDER BY DATE_TRUNC('month', o.created_at) DESC;
    `;

    const dailySql = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') as month_key,
        TO_CHAR(DATE(o.created_at), 'YYYY-MM-DD') as date_str,
        TO_CHAR(DATE(o.created_at), 'DD Mon YYYY') as formatted_date,
        TRIM(TO_CHAR(DATE(o.created_at), 'FMDay')) as day_of_week,
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) as revenue,
        COALESCE(AVG(CASE WHEN p.status = 'PAID' THEN p.amount END), 0) as avg_order_value
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.restaurant_id = $1
      GROUP BY DATE_TRUNC('month', o.created_at), DATE(o.created_at)
      ORDER BY DATE(o.created_at) DESC;
    `;

    const [monthlyRes, dailyRes] = await Promise.all([
      query(monthlySql, [restaurantId]),
      query(dailySql, [restaurantId]),
    ]);

    const dailyByMonth = new Map<string, DayHistoryItem[]>();
    for (const r of dailyRes.rows) {
      const item: DayHistoryItem = {
        dateStr: r.date_str,
        formattedDate: r.formatted_date,
        dayOfWeek: r.day_of_week,
        totalOrders: parseInt(r.total_orders || '0', 10),
        deliveredOrders: parseInt(r.delivered_orders || '0', 10),
        cancelledOrders: parseInt(r.cancelled_orders || '0', 10),
        revenue: parseFloat(r.revenue || '0'),
        avgOrderValue: parseFloat(r.avg_order_value || '0'),
      };
      const existing = dailyByMonth.get(r.month_key) || [];
      existing.push(item);
      dailyByMonth.set(r.month_key, existing);
    }

    return monthlyRes.rows.map((r) => ({
      monthKey: r.month_key,
      monthLabel: r.month_label,
      totalOrders: parseInt(r.total_orders || '0', 10),
      deliveredOrders: parseInt(r.delivered_orders || '0', 10),
      cancelledOrders: parseInt(r.cancelled_orders || '0', 10),
      revenue: parseFloat(r.revenue || '0'),
      avgOrderValue: parseFloat(r.avg_order_value || '0'),
      days: dailyByMonth.get(r.month_key) || [],
    }));
  }

  async getRevenueByDay(restaurantId: string, days = 7): Promise<{ date: string; revenue: number; orders: number }[]> {
    const sql = `
      SELECT 
        TO_CHAR(d.day, 'YYYY-MM-DD') as date,
        COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) as revenue,
        COUNT(DISTINCT o.id) as orders
      FROM (
        SELECT CURRENT_DATE - i as day 
        FROM generate_series(0, $2 - 1) i
      ) d
      LEFT JOIN orders o ON DATE(o.created_at) = d.day AND o.restaurant_id = $1
      LEFT JOIN payments p ON o.id = p.order_id
      GROUP BY d.day
      ORDER BY d.day ASC;
    `;
    const res = await query(sql, [restaurantId, days]);
    return res.rows.map((r) => ({
      date: r.date,
      revenue: parseFloat(r.revenue),
      orders: parseInt(r.orders, 10),
    }));
  }

  async getHourlyDistribution(restaurantId: string): Promise<{ hour: string; count: number }[]> {
    const sql = `
      SELECT 
        TO_CHAR(h, 'HH12 AM') as hour_label,
        EXTRACT(HOUR FROM h) as hour_num,
        COUNT(o.id) as count
      FROM (
        SELECT (CURRENT_DATE + (i || ' hour')::interval) as h
        FROM generate_series(8, 22) i
      ) series
      LEFT JOIN orders o 
        ON EXTRACT(HOUR FROM o.created_at) = EXTRACT(HOUR FROM series.h)
        AND DATE(o.created_at) = CURRENT_DATE
        AND o.restaurant_id = $1
      GROUP BY series.h
      ORDER BY EXTRACT(HOUR FROM series.h) ASC;
    `;
    const res = await query(sql, [restaurantId]);
    return res.rows.map((r) => ({
      hour: r.hour_label,
      count: parseInt(r.count, 10),
    }));
  }

  async getTopFoods(restaurantId: string, limit = 5): Promise<{ name: string; quantity: number; sales: number }[]> {
    const sql = `
      SELECT 
        oi.food_name as name,
        SUM(oi.quantity) as quantity,
        SUM(oi.total_price) as sales
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN payments p ON o.id = p.order_id
      WHERE o.restaurant_id = $1 AND p.status = 'PAID'
      GROUP BY oi.food_name
      ORDER BY quantity DESC
      LIMIT $2;
    `;
    const res = await query(sql, [restaurantId, limit]);
    return res.rows.map((r) => ({
      name: r.name,
      quantity: parseInt(r.quantity, 10),
      sales: parseFloat(r.sales),
    }));
  }

  async getPaymentDistribution(restaurantId: string): Promise<{ method: string; count: number; amount: number }[]> {
    const sql = `
      SELECT 
        p.payment_method as method,
        COUNT(p.id) as count,
        COALESCE(SUM(p.amount), 0) as amount
      FROM payments p
      WHERE p.restaurant_id = $1
      GROUP BY p.payment_method
      ORDER BY count DESC;
    `;
    const res = await query(sql, [restaurantId]);
    return res.rows.map((r) => ({
      method: r.method,
      count: parseInt(r.count, 10),
      amount: parseFloat(r.amount),
    }));
  }
}
