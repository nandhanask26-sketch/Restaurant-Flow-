import { query, getClient } from '../config/database';
import { MenuSchedule, MealType, Food } from '../types';

export class MenuRepository {
  async findSchedulesByDate(restaurantId: string, menuDate: string): Promise<MenuSchedule[]> {
    const res = await query(
      `SELECT id, restaurant_id, menu_date, meal_type, title, is_active, created_at, updated_at
       FROM menu_schedules
       WHERE restaurant_id = $1 AND menu_date = $2
       ORDER BY 
        CASE meal_type
          WHEN 'BREAKFAST' THEN 1
          WHEN 'LUNCH' THEN 2
          WHEN 'SNACKS' THEN 3
          WHEN 'DINNER' THEN 4
          ELSE 5
        END ASC`,
      [restaurantId, menuDate]
    );

    const schedules: MenuSchedule[] = [];
    for (const row of res.rows) {
      const foods = await this.getFoodsForSchedule(row.id);
      schedules.push({
        id: row.id,
        restaurantId: row.restaurant_id,
        menuDate: row.menu_date,
        mealType: row.meal_type as MealType,
        title: row.title,
        isActive: row.is_active,
        items: foods,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    return schedules;
  }

  async findScheduleById(id: string): Promise<MenuSchedule | null> {
    const res = await query(
      `SELECT id, restaurant_id, menu_date, meal_type, title, is_active, created_at, updated_at
       FROM menu_schedules
       WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const foods = await this.getFoodsForSchedule(row.id);
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      menuDate: row.menu_date,
      mealType: row.meal_type as MealType,
      title: row.title,
      isActive: row.is_active,
      items: foods,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveSchedule(
    restaurantId: string,
    menuDate: string,
    mealType: MealType,
    title: string | undefined,
    foodIds: string[]
  ): Promise<MenuSchedule> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO menu_schedules (restaurant_id, menu_date, meal_type, title, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (restaurant_id, menu_date, meal_type)
         DO UPDATE SET title = EXCLUDED.title, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
         RETURNING id, restaurant_id, menu_date, meal_type, title, is_active, created_at, updated_at;`,
        [restaurantId, menuDate, mealType, title || null]
      );
      const scheduleId = rows[0].id;

      // Replace items
      await client.query(`DELETE FROM menu_items WHERE menu_schedule_id = $1`, [scheduleId]);

      for (const foodId of foodIds) {
        await client.query(
          `INSERT INTO menu_items (menu_schedule_id, food_id, is_available)
           VALUES ($1, $2, TRUE)
           ON CONFLICT DO NOTHING;`,
          [scheduleId, foodId]
        );
      }

      await client.query('COMMIT');
      const saved = await this.findScheduleById(scheduleId);
      return saved!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const res = await query(`DELETE FROM menu_schedules WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  private async getFoodsForSchedule(scheduleId: string): Promise<Food[]> {
    const res = await query(
      `SELECT 
        f.id, f.restaurant_id, f.category_id, c.name as category_name,
        f.name, f.description, 
        COALESCE(mi.custom_price, f.price) as price,
        f.image_url, f.preparation_time_minutes, 
        (f.is_available AND mi.is_available) as is_available,
        f.is_vegetarian,
        COALESCE(i.quantity, 0) as inventory_quantity,
        f.created_at, f.updated_at
       FROM menu_items mi
       JOIN foods f ON mi.food_id = f.id
       LEFT JOIN categories c ON f.category_id = c.id
       LEFT JOIN inventory i ON f.id = i.food_id
       WHERE mi.menu_schedule_id = $1
       ORDER BY f.name ASC`,
      [scheduleId]
    );

    return res.rows.map((row) => ({
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
      inventoryQuantity: parseInt(row.inventory_quantity, 10),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
