-- Migration 011: Revenue Views and Analytics Aggregates
CREATE OR REPLACE VIEW v_daily_restaurant_revenue AS
SELECT 
    o.restaurant_id,
    DATE(o.created_at) as order_date,
    COUNT(o.id) as total_orders,
    COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END) as cancelled_orders,
    COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) as total_revenue,
    COALESCE(AVG(CASE WHEN p.status = 'PAID' THEN p.amount END), 0) as avg_order_value,
    COUNT(CASE WHEN p.payment_method = 'UPI' AND p.status = 'PAID' THEN 1 END) as upi_orders,
    COUNT(CASE WHEN p.payment_method = 'CARD' AND p.status = 'PAID' THEN 1 END) as card_orders,
    COUNT(CASE WHEN p.payment_method = 'CASH_ON_DELIVERY' AND p.status = 'PAID' THEN 1 END) as cod_paid_orders,
    COUNT(CASE WHEN p.payment_method = 'CASH_ON_DELIVERY' AND p.status = 'UNPAID' THEN 1 END) as cod_unpaid_orders
FROM orders o
LEFT JOIN payments p ON o.id = p.order_id
GROUP BY o.restaurant_id, DATE(o.created_at);

CREATE OR REPLACE VIEW v_top_selling_foods AS
SELECT 
    o.restaurant_id,
    oi.food_id,
    oi.food_name,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.total_price) as total_gross_sales,
    COUNT(DISTINCT o.id) as order_appearances
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN payments p ON o.id = p.order_id
WHERE p.status = 'PAID' AND o.status != 'CANCELLED'
GROUP BY o.restaurant_id, oi.food_id, oi.food_name;
