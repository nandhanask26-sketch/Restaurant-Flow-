import { PoolClient } from 'pg';
import { query } from '../config/database';
import { User, UserRole } from '../types';

export class UserRepository {
  async findById(id: string, client?: PoolClient): Promise<User | null> {
    const q = 'SELECT id, full_name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = $1';
    const res = client ? await client.query(q, [id]) : await query(q, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  async findByEmail(email: string, includePassword = false): Promise<(User & { passwordHash?: string }) | null> {
    const fields = includePassword
      ? 'id, full_name, email, phone, password_hash, role, is_active, created_at, updated_at'
      : 'id, full_name, email, phone, role, is_active, created_at, updated_at';
    const res = await query(`SELECT ${fields} FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0], includePassword);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const res = await query(
      'SELECT id, full_name, email, phone, role, is_active, created_at, updated_at FROM users WHERE phone = $1',
      [phone]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  async create(
    user: {
      fullName: string;
      email: string;
      phone: string;
      passwordHash: string;
      role: UserRole;
    },
    client?: PoolClient
  ): Promise<User> {
    const sql = `
      INSERT INTO users (full_name, email, phone, password_hash, role)
      VALUES ($1, LOWER($2), $3, $4, $5)
      RETURNING id, full_name, email, phone, role, is_active, created_at, updated_at;
    `;
    const params = [user.fullName, user.email, user.phone, user.passwordHash, user.role];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return this.mapRowToUser(res.rows[0]);
  }

  async saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  async findRefreshToken(tokenHash: string): Promise<{ userId: string; isRevoked: boolean; expiresAt: Date } | null> {
    const res = await query(
      `SELECT user_id, is_revoked, expires_at FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    if (res.rows.length === 0) return null;
    return {
      userId: res.rows[0].user_id,
      isRevoked: res.rows[0].is_revoked,
      expiresAt: res.rows[0].expires_at,
    };
  }

  async revokeRefreshToken(tokenHash: string, replacedBy?: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens 
       SET is_revoked = TRUE, replaced_by_token_hash = $2 
       WHERE token_hash = $1`,
      [tokenHash, replacedBy || null]
    );
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await query(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1`, [userId]);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [passwordHash, userId]
    );
  }

  private mapRowToUser(row: any, includePassword = false): User & { passwordHash?: string } {
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      ...(includePassword && row.password_hash ? { passwordHash: row.password_hash } : {}),
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
