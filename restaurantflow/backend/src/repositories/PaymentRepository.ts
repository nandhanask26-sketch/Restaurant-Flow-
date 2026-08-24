import { PoolClient } from 'pg';
import { query } from '../config/database';
import { Payment, PaymentMethod, PaymentStatus } from '../types';

export class PaymentRepository {
  async create(
    payment: {
      orderId: string;
      restaurantId: string;
      userId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      paymentProvider?: string;
      status?: PaymentStatus;
      transactionId?: string;
      providerResponse?: any;
    },
    client?: PoolClient
  ): Promise<Payment> {
    const sql = `
      INSERT INTO payments (
        order_id, restaurant_id, user_id, amount, payment_method, payment_provider, status, transaction_id, provider_response, paid_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, order_id, restaurant_id, user_id, amount, payment_method, payment_provider, status, transaction_id, provider_response, paid_at, created_at, updated_at;
    `;
    const isPaid = payment.status === 'PAID';
    const params = [
      payment.orderId,
      payment.restaurantId,
      payment.userId,
      payment.amount,
      payment.paymentMethod,
      payment.paymentProvider || 'mock',
      payment.status || 'PENDING',
      payment.transactionId || null,
      payment.providerResponse ? JSON.stringify(payment.providerResponse) : null,
      isPaid ? new Date() : null,
    ];

    const res = client ? await client.query(sql, params) : await query(sql, params);
    return this.mapRowToPayment(res.rows[0]);
  }

  async findByOrderId(orderId: string, client?: PoolClient): Promise<Payment | null> {
    const sql = `
      SELECT id, order_id, restaurant_id, user_id, amount, payment_method, payment_provider, status, transaction_id, provider_response, paid_at, created_at, updated_at
      FROM payments
      WHERE order_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const res = client ? await client.query(sql, [orderId]) : await query(sql, [orderId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToPayment(res.rows[0]);
  }

  async updateStatus(
    orderId: string,
    status: PaymentStatus,
    transactionId?: string,
    providerResponse?: any,
    client?: PoolClient
  ): Promise<Payment | null> {
    const isPaid = status === 'PAID';
    const sql = `
      UPDATE payments
      SET 
        status = $2,
        transaction_id = COALESCE($3, transaction_id),
        provider_response = COALESCE($4, provider_response),
        paid_at = CASE WHEN $5 = TRUE THEN CURRENT_TIMESTAMP ELSE paid_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1
      RETURNING id, order_id, restaurant_id, user_id, amount, payment_method, payment_provider, status, transaction_id, provider_response, paid_at, created_at, updated_at;
    `;
    const params = [
      orderId,
      status,
      transactionId || null,
      providerResponse ? JSON.stringify(providerResponse) : null,
      isPaid,
    ];

    const res = client ? await client.query(sql, params) : await query(sql, params);
    if (res.rows.length === 0) return null;
    return this.mapRowToPayment(res.rows[0]);
  }

  private mapRowToPayment(row: any): Payment {
    return {
      id: row.id,
      orderId: row.order_id,
      restaurantId: row.restaurant_id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      paymentMethod: row.payment_method as PaymentMethod,
      paymentProvider: row.payment_provider,
      status: row.status as PaymentStatus,
      transactionId: row.transaction_id,
      providerResponse: row.provider_response,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
