import { PoolClient } from 'pg';
import { query } from '../config/database';
import { Order, OrderItem, OrderStatus, PreferredTimeType } from '../types';

export class OrderRepository {
  async create(
    order: {
      restaurantId: string;
      userId: string;
      orderToken: string;
      status?: OrderStatus;
      preferredTimeType: PreferredTimeType;
      requestedFoodAt: Date;
      estimatedReadyAt?: Date;
      subtotal: number;
      tax: number;
      totalAmount: number;
      notes?: string;
    },
    items: {
      foodId: string;
      foodName: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }[],
    client: PoolClient
  ): Promise<Order> {
    const orderSql = `
      INSERT INTO orders (
        restaurant_id, user_id, order_token, status, preferred_time_type, requested_food_at,
        estimated_ready_at, subtotal, tax, total_amount, notes, confirmed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, restaurant_id, user_id, order_token, status, preferred_time_type, requested_food_at,
                estimated_ready_at, subtotal, tax, total_amount, notes, cancellation_reason,
                created_at, confirmed_at, preparing_at, ready_at, delivered_at, cancelled_at, updated_at;
    `;
    const initialStatus = order.status || 'CREATED';
    const isConfirmed = initialStatus === 'CONFIRMED';
    const orderParams = [
      order.restaurantId,
      order.userId,
      order.orderToken,
      initialStatus,
      order.preferredTimeType,
      order.requestedFoodAt,
      order.estimatedReadyAt || null,
      order.subtotal,
      order.tax,
      order.totalAmount,
      order.notes || null,
      isConfirmed ? new Date() : null,
    ];

    const { rows: orderRows } = await client.query(orderSql, orderParams);
    const createdOrder = this.mapRowToOrder(orderRows[0]);

    // Insert line items
    const insertedItems: OrderItem[] = [];
    for (const item of items) {
      const itemSql = `
        INSERT INTO order_items (order_id, food_id, food_name, unit_price, quantity, total_price)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, order_id, food_id, food_name, unit_price, quantity, total_price, created_at;
      `;
      const itemParams = [
        createdOrder.id,
        item.foodId,
        item.foodName,
        item.unitPrice,
        item.quantity,
        item.totalPrice,
      ];
      const { rows: itemRows } = await client.query(itemSql, itemParams);
      insertedItems.push(this.mapRowToOrderItem(itemRows[0]));
    }

    createdOrder.items = insertedItems;
    return createdOrder;
  }

  async findById(id: string, client?: PoolClient): Promise<Order | null> {
    const sql = `
      SELECT 
        o.id, o.restaurant_id, r.name as restaurant_name,
        o.user_id, u.full_name as customer_name, u.phone as customer_phone, u.email as customer_email,
        o.order_token, o.status, o.preferred_time_type, o.requested_food_at,
        o.estimated_ready_at, o.subtotal, o.tax, o.total_amount, o.notes, o.cancellation_reason,
        o.created_at, o.confirmed_at, o.preparing_at, o.ready_at, o.delivered_at, o.cancelled_at, o.updated_at
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    if (res.rows.length === 0) return null;

    const order = this.mapRowToOrder(res.rows[0]);
    order.items = await this.getOrderItems(order.id, client);
    order.payment = await this.getOrderPayment(order.id, client);
    return order;
  }

  async findByToken(token: string, client?: PoolClient): Promise<Order | null> {
    const sql = `
      SELECT 
        o.id, o.restaurant_id, r.name as restaurant_name,
        o.user_id, u.full_name as customer_name, u.phone as customer_phone, u.email as customer_email,
        o.order_token, o.status, o.preferred_time_type, o.requested_food_at,
        o.estimated_ready_at, o.subtotal, o.tax, o.total_amount, o.notes, o.cancellation_reason,
        o.created_at, o.confirmed_at, o.preparing_at, o.ready_at, o.delivered_at, o.cancelled_at, o.updated_at
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      WHERE UPPER(o.order_token) = UPPER($1)
    `;
    const res = client ? await client.query(sql, [token]) : await query(sql, [token]);
    if (res.rows.length === 0) return null;

    const order = this.mapRowToOrder(res.rows[0]);
    order.items = await this.getOrderItems(order.id, client);
    order.payment = await this.getOrderPayment(order.id, client);
    return order;
  }

  async findAll(options: {
    restaurantId?: string;
    userId?: string;
    status?: string;
    paymentMethod?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number; totalPages: number }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (options.restaurantId) {
      whereClause += ` AND o.restaurant_id = $${idx++}`;
      params.push(options.restaurantId);
    }
    if (options.userId) {
      whereClause += ` AND o.user_id = $${idx++}`;
      params.push(options.userId);
    }
    if (options.status) {
      if (options.status.includes(',')) {
        const statuses = options.status.split(',').map((s) => s.trim());
        whereClause += ` AND o.status = ANY($${idx++})`;
        params.push(statuses);
      } else {
        whereClause += ` AND o.status = $${idx++}`;
        params.push(options.status);
      }
    }
    if (options.search) {
      whereClause += ` AND (o.order_token ILIKE $${idx} OR u.full_name ILIKE $${idx} OR u.phone ILIKE $${idx})`;
      params.push(`%${options.search}%`);
      idx++;
    }

    const countRes = await query(
      `SELECT COUNT(o.id) as count FROM orders o JOIN users u ON o.user_id = u.id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit) || 1;

    const sql = `
      SELECT 
        o.id, o.restaurant_id, r.name as restaurant_name,
        o.user_id, u.full_name as customer_name, u.phone as customer_phone, u.email as customer_email,
        o.order_token, o.status, o.preferred_time_type, o.requested_food_at,
        o.estimated_ready_at, o.subtotal, o.tax, o.total_amount, o.notes, o.cancellation_reason,
        o.created_at, o.confirmed_at, o.preparing_at, o.ready_at, o.delivered_at, o.cancelled_at, o.updated_at,
        p.id as payment_id, p.payment_method, p.status as payment_status, p.transaction_id, p.amount as payment_amount
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);

    const res = await query(sql, params);
    const orders: Order[] = [];

    for (const row of res.rows) {
      const order = this.mapRowToOrder(row);
      if (row.payment_id) {
        order.payment = {
          id: row.payment_id,
          orderId: order.id,
          restaurantId: order.restaurantId,
          userId: order.userId,
          amount: parseFloat(row.payment_amount),
          paymentMethod: row.payment_method,
          paymentProvider: 'mock',
          status: row.payment_status,
          transactionId: row.transaction_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
      order.items = await this.getOrderItems(order.id);
      orders.push(order);
    }

    return { orders, total, totalPages };
  }

  async getSmartQueue(restaurantId: string): Promise<Order[]> {
    const sql = `
      SELECT 
        o.id, o.restaurant_id, r.name as restaurant_name,
        o.user_id, u.full_name as customer_name, u.phone as customer_phone, u.email as customer_email,
        o.order_token, o.status, o.preferred_time_type, o.requested_food_at,
        o.estimated_ready_at, o.subtotal, o.tax, o.total_amount, o.notes, o.cancellation_reason,
        o.created_at, o.confirmed_at, o.preparing_at, o.ready_at, o.delivered_at, o.cancelled_at, o.updated_at,
        p.id as payment_id, p.payment_method, p.status as payment_status, p.transaction_id, p.amount as payment_amount
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.restaurant_id = $1
        AND o.status = 'CONFIRMED'
      ORDER BY 
        o.requested_food_at ASC,
        o.created_at ASC
    `;
    const res = await query(sql, [restaurantId]);
    const orders: Order[] = [];

    for (const row of res.rows) {
      const order = this.mapRowToOrder(row);
      if (row.payment_id) {
        order.payment = {
          id: row.payment_id,
          orderId: order.id,
          restaurantId: order.restaurantId,
          userId: order.userId,
          amount: parseFloat(row.payment_amount),
          paymentMethod: row.payment_method,
          paymentProvider: 'mock',
          status: row.payment_status,
          transactionId: row.transaction_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
      order.items = await this.getOrderItems(order.id);
      orders.push(order);
    }
    return orders;
  }

  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    extra?: { cancellationReason?: string; notes?: string },
    client?: PoolClient
  ): Promise<Order | null> {
    const timestampField =
      newStatus === 'CONFIRMED'
        ? 'confirmed_at = CURRENT_TIMESTAMP,'
        : newStatus === 'DELIVERED'
        ? 'delivered_at = CURRENT_TIMESTAMP,'
        : newStatus === 'CANCELLED'
        ? 'cancelled_at = CURRENT_TIMESTAMP,'
        : '';

    const sql = `
      UPDATE orders
      SET 
        status = $2,
        ${timestampField}
        cancellation_reason = COALESCE($3, cancellation_reason),
        notes = COALESCE($4, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id;
    `;
    const params = [id, newStatus, extra?.cancellationReason || null, extra?.notes || null];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    if (res.rows.length === 0) return null;
    return this.findById(id, client);
  }

  async deleteOrder(id: string, restaurantId?: string): Promise<boolean> {
    const checkSql = restaurantId
      ? `SELECT id FROM orders WHERE id = $1 AND restaurant_id = $2`
      : `SELECT id FROM orders WHERE id = $1`;
    const checkParams = restaurantId ? [id, restaurantId] : [id];
    const checkRes = await query(checkSql, checkParams);
    if (checkRes.rows.length === 0) return false;

    // Delete dependent tables
    await query(`DELETE FROM payments WHERE order_id = $1`, [id]);
    await query(`DELETE FROM qr_codes WHERE order_id = $1`, [id]);
    await query(`DELETE FROM order_tokens WHERE order_id = $1`, [id]);
    await query(`DELETE FROM order_items WHERE order_id = $1`, [id]);
    const delRes = await query(`DELETE FROM orders WHERE id = $1`, [id]);

    return (delRes.rowCount ?? 0) > 0;
  }

  async deleteBulkOrders(orderIds: string[], restaurantId?: string): Promise<number> {
    if (!orderIds || orderIds.length === 0) return 0;

    let count = 0;
    for (const id of orderIds) {
      const deleted = await this.deleteOrder(id, restaurantId);
      if (deleted) count++;
    }
    return count;
  }

  async clearHistory(
    restaurantId: string,
    options?: { date?: string; status?: string }
  ): Promise<number> {
    let whereClause = `WHERE restaurant_id = $1`;
    const params: any[] = [restaurantId];
    let idx = 2;

    if (options?.date) {
      if (options.date === 'today') {
        whereClause += ` AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE`;
      } else {
        whereClause += ` AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = $${idx++}`;
        params.push(options.date);
      }
    }

    if (options?.status && options.status !== 'ALL') {
      whereClause += ` AND status = $${idx++}`;
      params.push(options.status);
    }

    const selectSql = `SELECT id FROM orders ${whereClause}`;
    const res = await query(selectSql, params);
    const orderIds = res.rows.map((r) => r.id);

    return await this.deleteBulkOrders(orderIds, restaurantId);
  }

  private async getOrderItems(orderId: string, client?: PoolClient): Promise<OrderItem[]> {
    const sql = `
      SELECT id, order_id, food_id, food_name, unit_price, quantity, total_price, created_at
      FROM order_items
      WHERE order_id = $1
      ORDER BY food_name ASC
    `;
    const res = client ? await client.query(sql, [orderId]) : await query(sql, [orderId]);
    return res.rows.map(this.mapRowToOrderItem);
  }

  private async getOrderPayment(orderId: string, client?: PoolClient) {
    const sql = `
      SELECT id, order_id, restaurant_id, user_id, amount, payment_method, payment_provider, status, transaction_id, paid_at, created_at, updated_at
      FROM payments
      WHERE order_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const res = client ? await client.query(sql, [orderId]) : await query(sql, [orderId]);
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id,
      orderId: r.order_id,
      restaurantId: r.restaurant_id,
      userId: r.user_id,
      amount: parseFloat(r.amount),
      paymentMethod: r.payment_method,
      paymentProvider: r.payment_provider,
      status: r.status,
      transactionId: r.transaction_id,
      paidAt: r.paid_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      userId: row.user_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      orderToken: row.order_token,
      status: row.status as OrderStatus,
      preferredTimeType: row.preferred_time_type as PreferredTimeType,
      requestedFoodAt: row.requested_food_at,
      estimatedReadyAt: row.estimated_ready_at,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      totalAmount: parseFloat(row.total_amount),
      notes: row.notes,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      confirmedAt: row.confirmed_at,
      preparingAt: row.preparing_at,
      readyAt: row.ready_at,
      deliveredAt: row.delivered_at,
      cancelledAt: row.cancelled_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToOrderItem(row: any): OrderItem {
    return {
      id: row.id,
      orderId: row.order_id,
      foodId: row.food_id,
      foodName: row.food_name,
      unitPrice: parseFloat(row.unit_price),
      quantity: parseInt(row.quantity, 10),
      totalPrice: parseFloat(row.total_price),
      createdAt: row.created_at,
    };
  }
}
