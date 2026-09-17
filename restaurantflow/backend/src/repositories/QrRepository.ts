import { PoolClient } from 'pg';
import { query } from '../config/database';
import { QrCode } from '../types';
import QRCodeLib from 'qrcode';

export class QrRepository {
  async create(
    orderId: string,
    restaurantId: string,
    verificationCode: string,
    expiresAtHours = 8,
    client?: PoolClient
  ): Promise<QrCode> {
    const expiresAt = new Date(Date.now() + expiresAtHours * 60 * 60 * 1000);
    const sql = `
      INSERT INTO qr_codes (order_id, restaurant_id, verification_code, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (order_id) DO UPDATE
      SET verification_code = EXCLUDED.verification_code, expires_at = EXCLUDED.expires_at, is_scanned = FALSE, scanned_at = NULL
      RETURNING id, order_id, restaurant_id, verification_code, is_scanned, scanned_at, scanned_by, expires_at, created_at;
    `;
    const params = [orderId, restaurantId, verificationCode, expiresAt];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    const qr = this.mapRowToQr(res.rows[0]);
    qr.qrDataUrl = await this.generateDataUrl(qr.verificationCode);
    return qr;
  }

  async findByCode(verificationCode: string, client?: PoolClient): Promise<QrCode | null> {
    const sql = `
      SELECT id, order_id, restaurant_id, verification_code, is_scanned, scanned_at, scanned_by, expires_at, created_at
      FROM qr_codes
      WHERE verification_code = $1
    `;
    const res = client ? await client.query(sql, [verificationCode]) : await query(sql, [verificationCode]);
    if (res.rows.length === 0) return null;
    const qr = this.mapRowToQr(res.rows[0]);
    qr.qrDataUrl = await this.generateDataUrl(qr.verificationCode);
    return qr;
  }

  async findByOrderId(orderId: string, client?: PoolClient): Promise<QrCode | null> {
    const sql = `
      SELECT id, order_id, restaurant_id, verification_code, is_scanned, scanned_at, scanned_by, expires_at, created_at
      FROM qr_codes
      WHERE order_id = $1
    `;
    const res = client ? await client.query(sql, [orderId]) : await query(sql, [orderId]);
    if (res.rows.length === 0) return null;
    const qr = this.mapRowToQr(res.rows[0]);
    qr.qrDataUrl = await this.generateDataUrl(qr.verificationCode);
    return qr;
  }

  async findByPartialCodeOrOtp(input: string, restaurantId?: string, client?: PoolClient): Promise<QrCode | null> {
    const clean = input.trim();
    if (!clean) return null;

    let sql = `
      SELECT id, order_id, restaurant_id, verification_code, is_scanned, scanned_at, scanned_by, expires_at, created_at
      FROM qr_codes
      WHERE verification_code ILIKE $1
    `;
    const params: any[] = [`%${clean}%`];
    if (restaurantId) {
      sql += ` AND restaurant_id = $2`;
      params.push(restaurantId);
    }
    sql += ` ORDER BY created_at DESC LIMIT 1`;

    const res = client ? await client.query(sql, params) : await query(sql, params);
    if (res.rows.length > 0) {
      const qr = this.mapRowToQr(res.rows[0]);
      qr.qrDataUrl = await this.generateDataUrl(qr.verificationCode);
      return qr;
    }
    return null;
  }

  async findRecentForRestaurant(restaurantId: string, limit = 100, client?: PoolClient): Promise<QrCode[]> {
    const sql = `
      SELECT id, order_id, restaurant_id, verification_code, is_scanned, scanned_at, scanned_by, expires_at, created_at
      FROM qr_codes
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const res = client ? await client.query(sql, [restaurantId, limit]) : await query(sql, [restaurantId, limit]);
    return res.rows.map((row) => this.mapRowToQr(row));
  }


  async markScanned(
    verificationCode: string,
    scannedByUserId: string,
    client?: PoolClient
  ): Promise<QrCode | null> {
    const sql = `
      UPDATE qr_codes
      SET is_scanned = TRUE, scanned_at = CURRENT_TIMESTAMP, scanned_by = $2
      WHERE verification_code = $1
      RETURNING id, order_id, restaurant_id, verification_code, is_scanned, scanned_at, scanned_by, expires_at, created_at;
    `;
    const res = client ? await client.query(sql, [verificationCode, scannedByUserId]) : await query(sql, [verificationCode, scannedByUserId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToQr(res.rows[0]);
  }

  private async generateDataUrl(code: string): Promise<string> {
    try {
      return await QRCodeLib.toDataURL(code, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch {
      return '';
    }
  }

  private mapRowToQr(row: any): QrCode {
    return {
      id: row.id,
      orderId: row.order_id,
      restaurantId: row.restaurant_id,
      verificationCode: row.verification_code,
      isScanned: row.is_scanned,
      scannedAt: row.scanned_at,
      scannedBy: row.scanned_by,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
}
