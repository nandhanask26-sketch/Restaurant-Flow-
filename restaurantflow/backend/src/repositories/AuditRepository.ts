import { query } from '../config/database';
import { AuditLog } from '../types';

export class AuditRepository {
  async log(
    data: {
      userId?: string;
      restaurantId?: string;
      action: string;
      entityType: string;
      entityId?: string;
      metadata?: Record<string, any>;
      ipAddress?: string;
    }
  ): Promise<AuditLog> {
    const sql = `
      INSERT INTO audit_logs (user_id, restaurant_id, action, entity_type, entity_id, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, restaurant_id, action, entity_type, entity_id, metadata, ip_address, created_at;
    `;
    const params = [
      data.userId || null,
      data.restaurantId || null,
      data.action,
      data.entityType,
      data.entityId || null,
      data.metadata ? JSON.stringify(data.metadata) : '{}',
      data.ipAddress || null,
    ];

    const res = await query(sql, params);
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      restaurantId: r.restaurant_id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadata: r.metadata,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    };
  }

  async findByRestaurant(restaurantId: string, limit = 50): Promise<AuditLog[]> {
    const res = await query(
      `SELECT id, user_id, restaurant_id, action, entity_type, entity_id, metadata, ip_address, created_at
       FROM audit_logs
       WHERE restaurant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [restaurantId, limit]
    );

    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      restaurantId: r.restaurant_id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadata: r.metadata,
      ipAddress: r.ip_address,
      createdAt: r.created_at,
    }));
  }
}
