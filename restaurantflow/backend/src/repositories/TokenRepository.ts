import { PoolClient } from 'pg';
import { query } from '../config/database';

export class TokenRepository {
  /**
   * Generates a deterministic, unique, sequential daily token for an order.
   * Format: RF-YYYYMMDD-001
   * Uses transactional SELECT ... FOR UPDATE to prevent race conditions.
   */
  async generateDailyToken(
    restaurantId: string,
    orderId: string,
    client: PoolClient
  ): Promise<{ tokenString: string; sequenceNumber: number; tokenDate: string }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dateCode = today.replace(/-/g, ''); // YYYYMMDD

    // 1. Ensure row exists for today for this restaurant
    await client.query(
      `INSERT INTO daily_token_sequences (restaurant_id, token_date, current_sequence)
       VALUES ($1, $2, 0)
       ON CONFLICT (restaurant_id, token_date) DO NOTHING;`,
      [restaurantId, today]
    );

    // 2. Lock the sequence row and increment atomically
    const { rows } = await client.query(
      `UPDATE daily_token_sequences
       SET current_sequence = current_sequence + 1, updated_at = CURRENT_TIMESTAMP
       WHERE restaurant_id = $1 AND token_date = $2
       RETURNING current_sequence;`,
      [restaurantId, today]
    );

    const sequenceNumber = parseInt(rows[0].current_sequence, 10);
    const paddedSeq = String(sequenceNumber).padStart(3, '0');
    // Meaningful token format: Date (DD) + Month (MM) + Order Sequence on that day (e.g. 1209001)
    const now = new Date();
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const tokenString = `${dayStr}${monthStr}${paddedSeq}`;

    // 3. Save order_tokens mapping
    await client.query(
      `INSERT INTO order_tokens (order_id, restaurant_id, token_string, token_date, sequence_number)
       VALUES ($1, $2, $3, $4, $5);`,
      [orderId, restaurantId, tokenString, today, sequenceNumber]
    );

    return { tokenString, sequenceNumber, tokenDate: today };
  }

  async findByToken(tokenString: string, client?: PoolClient): Promise<{ orderId: string; restaurantId: string } | null> {
    const clean = tokenString.trim();
    // 1. Direct match on full token (e.g. TK-0909-001 or RF-20260909-001)
    let sql = `SELECT order_id, restaurant_id FROM order_tokens WHERE UPPER(token_string) = UPPER($1)`;
    let res = client ? await client.query(sql, [clean]) : await query(sql, [clean]);
    if (res.rows.length > 0) {
      return { orderId: res.rows[0].order_id, restaurantId: res.rows[0].restaurant_id };
    }

    // 2. Partial sequence match for today (e.g. if manager types "001" or "1" or "TK-001")
    const seqNum = parseInt(clean.replace(/\D/g, ''), 10);
    if (!isNaN(seqNum)) {
      const today = new Date().toISOString().split('T')[0];
      sql = `SELECT order_id, restaurant_id FROM order_tokens WHERE sequence_number = $1 AND token_date = $2 ORDER BY created_at DESC LIMIT 1`;
      res = client ? await client.query(sql, [seqNum, today]) : await query(sql, [seqNum, today]);
      if (res.rows.length > 0) {
        return { orderId: res.rows[0].order_id, restaurantId: res.rows[0].restaurant_id };
      }
    }

    return null;
  }
}
