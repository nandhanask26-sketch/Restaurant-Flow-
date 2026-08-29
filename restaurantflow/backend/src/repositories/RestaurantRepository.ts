import { PoolClient } from 'pg';
import { query } from '../config/database';
import { Restaurant } from '../types';

export class RestaurantRepository {
  async findAll(): Promise<Restaurant[]> {
    const res = await query(`
      SELECT id, name, description, address, phone, email, is_open, opening_time, closing_time, image_url, created_at, updated_at
      FROM restaurants
      ORDER BY name ASC
    `);
    return res.rows.map(this.mapRowToRestaurant);
  }

  async findById(id: string, client?: PoolClient): Promise<Restaurant | null> {
    const sql = `
      SELECT id, name, description, address, phone, email, is_open, opening_time, closing_time, image_url, created_at, updated_at
      FROM restaurants
      WHERE id = $1
    `;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToRestaurant(res.rows[0]);
  }

  async findByManagerUserId(userId: string): Promise<Restaurant | null> {
    const res = await query(
      `SELECT r.id, r.name, r.description, r.address, r.phone, r.email, r.is_open, r.opening_time, r.closing_time, r.image_url, r.created_at, r.updated_at
       FROM restaurants r
       JOIN restaurant_managers rm ON r.id = rm.restaurant_id
       WHERE rm.user_id = $1
       LIMIT 1`,
      [userId]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToRestaurant(res.rows[0]);
  }

  async create(
    restaurant: {
      name: string;
      description?: string;
      address: string;
      phone: string;
      email?: string;
      openingTime?: string;
      closingTime?: string;
    },
    managerUserId: string,
    client?: PoolClient
  ): Promise<Restaurant> {
    const sql = `
      INSERT INTO restaurants (name, description, address, phone, email, opening_time, closing_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, address, phone, email, is_open, opening_time, closing_time, image_url, created_at, updated_at;
    `;
    const params = [
      restaurant.name,
      restaurant.description || null,
      restaurant.address,
      restaurant.phone,
      restaurant.email || null,
      restaurant.openingTime || '08:00',
      restaurant.closingTime || '22:00',
    ];

    const res = client ? await client.query(sql, params) : await query(sql, params);
    const created = this.mapRowToRestaurant(res.rows[0]);

    // Link manager
    const linkSql = `
      INSERT INTO restaurant_managers (restaurant_id, user_id, is_primary)
      VALUES ($1, $2, TRUE)
    `;
    if (client) {
      await client.query(linkSql, [created.id, managerUserId]);
    } else {
      await query(linkSql, [created.id, managerUserId]);
    }

    return created;
  }

  async updateStatus(id: string, isOpen: boolean): Promise<Restaurant | null> {
    const res = await query(
      `UPDATE restaurants
       SET is_open = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, description, address, phone, email, is_open, opening_time, closing_time, image_url, created_at, updated_at`,
      [id, isOpen]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToRestaurant(res.rows[0]);
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      address?: string;
      phone?: string;
      email?: string | null;
      openingTime?: string;
      closingTime?: string;
      imageUrl?: string | null;
      isOpen?: boolean;
    }
  ): Promise<Restaurant | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(data.address);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.openingTime !== undefined) {
      fields.push(`opening_time = $${idx++}`);
      values.push(data.openingTime);
    }
    if (data.closingTime !== undefined) {
      fields.push(`closing_time = $${idx++}`);
      values.push(data.closingTime);
    }
    if (data.imageUrl !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(data.imageUrl);
    }
    if (data.isOpen !== undefined) {
      fields.push(`is_open = $${idx++}`);
      values.push(data.isOpen);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE restaurants
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, description, address, phone, email, is_open, opening_time, closing_time, image_url, created_at, updated_at
    `;

    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    return this.mapRowToRestaurant(res.rows[0]);
  }

  private mapRowToRestaurant(row: any): Restaurant {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      phone: row.phone,
      email: row.email,
      isOpen: row.is_open,
      openingTime: row.opening_time,
      closingTime: row.closing_time,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
