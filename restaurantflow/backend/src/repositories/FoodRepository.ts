import { PoolClient } from 'pg';
import { query } from '../config/database';
import { Food, Category } from '../types';

export class FoodRepository {
  async findAllByRestaurant(
    restaurantId: string,
    options?: { categoryId?: string; onlyAvailable?: boolean; search?: string }
  ): Promise<Food[]> {
    let sql = `
      SELECT 
        f.id, f.restaurant_id, f.category_id, c.name as category_name,
        f.name, f.description, f.price, f.image_url,
        f.preparation_time_minutes, f.is_available, f.is_vegetarian,
        COALESCE(i.quantity, 0) as inventory_quantity,
        f.created_at, f.updated_at
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN inventory i ON f.id = i.food_id
      WHERE f.restaurant_id = $1
    `;
    const params: any[] = [restaurantId];
    let paramIndex = 2;

    if (options?.categoryId) {
      sql += ` AND f.category_id = $${paramIndex}`;
      params.push(options.categoryId);
      paramIndex++;
    }

    if (options?.onlyAvailable) {
      sql += ` AND f.is_available = TRUE AND COALESCE(i.quantity, 0) > 0`;
    }

    if (options?.search) {
      sql += ` AND (f.name ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex})`;
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY c.display_order ASC NULLS LAST, f.name ASC`;

    const res = await query(sql, params);
    return res.rows.map(this.mapRowToFood);
  }

  async findById(id: string, client?: PoolClient): Promise<Food | null> {
    const sql = `
      SELECT 
        f.id, f.restaurant_id, f.category_id, c.name as category_name,
        f.name, f.description, f.price, f.image_url,
        f.preparation_time_minutes, f.is_available, f.is_vegetarian,
        COALESCE(i.quantity, 0) as inventory_quantity,
        f.created_at, f.updated_at
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN inventory i ON f.id = i.food_id
      WHERE f.id = $1
    `;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToFood(res.rows[0]);
  }

  async findByNameAndRestaurant(name: string, restaurantId: string, client?: PoolClient): Promise<Food | null> {
    const sql = `
      SELECT 
        f.id, f.restaurant_id, f.category_id, c.name as category_name,
        f.name, f.description, f.price, f.image_url,
        f.preparation_time_minutes, f.is_available, f.is_vegetarian,
        COALESCE(i.quantity, 0) as inventory_quantity,
        f.created_at, f.updated_at
      FROM foods f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN inventory i ON f.id = i.food_id
      WHERE LOWER(TRIM(f.name)) = LOWER(TRIM($1)) AND f.restaurant_id = $2
      LIMIT 1
    `;
    const res = client ? await client.query(sql, [name, restaurantId]) : await query(sql, [name, restaurantId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToFood(res.rows[0]);
  }

  async create(
    food: {
      restaurantId: string;
      categoryId?: string | null;
      name: string;
      description?: string;
      price: number;
      imageUrl?: string | null;
      preparationTimeMinutes: number;
      isAvailable?: boolean;
      isVegetarian?: boolean;
      initialStock?: number;
    },
    client?: PoolClient
  ): Promise<Food> {
    const sql = `
      INSERT INTO foods (
        restaurant_id, category_id, name, description, price,
        image_url, preparation_time_minutes, is_available, is_vegetarian
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, restaurant_id, category_id, name, description, price, image_url, preparation_time_minutes, is_available, is_vegetarian, created_at, updated_at;
    `;
    const params = [
      food.restaurantId,
      food.categoryId || null,
      food.name,
      food.description || null,
      food.price,
      food.imageUrl || null,
      food.preparationTimeMinutes || 15,
      food.isAvailable !== false,
      food.isVegetarian || false,
    ];

    const res = client ? await client.query(sql, params) : await query(sql, params);
    const createdFood = this.mapRowToFood(res.rows[0]);

    // Create inventory record
    const stock = food.initialStock ?? 20;
    const invSql = `
      INSERT INTO inventory (restaurant_id, food_id, quantity, low_stock_threshold)
      VALUES ($1, $2, $3, 5)
      ON CONFLICT (food_id) DO UPDATE SET quantity = EXCLUDED.quantity;
    `;
    if (client) {
      await client.query(invSql, [food.restaurantId, createdFood.id, stock]);
    } else {
      await query(invSql, [food.restaurantId, createdFood.id, stock]);
    }
    createdFood.inventoryQuantity = stock;

    return createdFood;
  }

  async update(id: string, food: Partial<Food>, client?: PoolClient): Promise<Food | null> {
    const fields: string[] = [];
    const params: any[] = [id];
    let idx = 2;

    if (food.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(food.name);
    }
    if (food.description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(food.description);
    }
    if (food.categoryId !== undefined) {
      fields.push(`category_id = $${idx++}`);
      params.push(food.categoryId);
    }
    if (food.price !== undefined) {
      fields.push(`price = $${idx++}`);
      params.push(food.price);
    }
    if (food.imageUrl !== undefined) {
      fields.push(`image_url = $${idx++}`);
      params.push(food.imageUrl);
    }
    if (food.preparationTimeMinutes !== undefined) {
      fields.push(`preparation_time_minutes = $${idx++}`);
      params.push(food.preparationTimeMinutes);
    }
    if (food.isAvailable !== undefined) {
      fields.push(`is_available = $${idx++}`);
      params.push(food.isAvailable);
    }
    if (food.isVegetarian !== undefined) {
      fields.push(`is_vegetarian = $${idx++}`);
      params.push(food.isVegetarian);
    }

    if (fields.length === 0) {
      return this.findById(id, client);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    const sql = `
      UPDATE foods
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING id;
    `;

    const res = client ? await client.query(sql, params) : await query(sql, params);
    if (res.rows.length === 0) return null;
    return this.findById(id, client);
  }

  async delete(id: string): Promise<boolean> {
    const res = await query('DELETE FROM foods WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async getCategories(restaurantId: string): Promise<Category[]> {
    const res = await query(
      `SELECT id, restaurant_id, name, display_order, created_at, updated_at
       FROM categories
       WHERE restaurant_id = $1
       ORDER BY display_order ASC, name ASC`,
      [restaurantId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      restaurantId: r.restaurant_id,
      name: r.name,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createCategory(restaurantId: string, name: string, displayOrder = 0): Promise<Category> {
    const res = await query(
      `INSERT INTO categories (restaurant_id, name, display_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (restaurant_id, name) DO UPDATE SET display_order = EXCLUDED.display_order
       RETURNING id, restaurant_id, name, display_order, created_at, updated_at`,
      [restaurantId, name, displayOrder]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      restaurantId: r.restaurant_id,
      name: r.name,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapRowToFood(row: any): Food {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      imageUrl: row.image_url,
      preparationTimeMinutes: row.preparation_time_minutes,
      isAvailable: row.is_available,
      isVegetarian: row.is_vegetarian,
      inventoryQuantity: row.inventory_quantity !== undefined ? parseInt(row.inventory_quantity, 10) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
