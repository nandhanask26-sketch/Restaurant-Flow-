import { PoolClient } from 'pg';
import { query } from '../config/database';
import { Inventory } from '../types';
import { OutOfStockError } from '../utils/errors';

export class InventoryRepository {
  async getByFoodId(foodId: string, client?: PoolClient): Promise<Inventory | null> {
    const sql = `
      SELECT id, restaurant_id, food_id, quantity, low_stock_threshold, last_restocked_at, created_at, updated_at
      FROM inventory
      WHERE food_id = $1
    `;
    const res = client ? await client.query(sql, [foodId]) : await query(sql, [foodId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToInventory(res.rows[0]);
  }

  async getAllByRestaurant(restaurantId: string): Promise<
    (Inventory & { foodName: string; categoryName?: string; isAvailable: boolean; price: number })[]
  > {
    const res = await query(
      `SELECT 
        i.id, i.restaurant_id, i.food_id, i.quantity, i.low_stock_threshold, i.last_restocked_at, i.created_at, i.updated_at,
        f.name as food_name, f.is_available, f.price, c.name as category_name
       FROM inventory i
       JOIN foods f ON i.food_id = f.id
       LEFT JOIN categories c ON f.category_id = c.id
       WHERE i.restaurant_id = $1
       ORDER BY i.quantity ASC, f.name ASC`,
      [restaurantId]
    );

    return res.rows.map((r) => ({
      ...this.mapRowToInventory(r),
      foodName: r.food_name,
      categoryName: r.category_name,
      isAvailable: r.is_available,
      price: parseFloat(r.price),
    }));
  }

  /**
   * Concurrency Critical:
   * Acquires row-level exclusive lock on inventory row (FOR UPDATE)
   * to guarantee race-free inventory deduction.
   */
  async lockAndDeductStock(
    foodId: string,
    requestedQuantity: number,
    orderId: string,
    client: PoolClient
  ): Promise<{ previousQuantity: number; newQuantity: number; restaurantId: string }> {
    // 1. Lock the inventory row exclusively
    const { rows } = await client.query(
      `SELECT id, restaurant_id, food_id, quantity 
       FROM inventory 
       WHERE food_id = $1 
       FOR UPDATE`,
      [foodId]
    );

    if (rows.length === 0) {
      throw new OutOfStockError(`Inventory record not found for food item: ${foodId}`);
    }

    const currentQuantity = parseInt(rows[0].quantity, 10);
    const restaurantId = rows[0].restaurant_id;

    if (currentQuantity < requestedQuantity) {
      throw new OutOfStockError(
        `Insufficient stock for item. Available: ${currentQuantity}, Requested: ${requestedQuantity}`
      );
    }

    const newQuantity = currentQuantity - requestedQuantity;

    // 2. Update the locked inventory row
    await client.query(
      `UPDATE inventory 
       SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE food_id = $2`,
      [newQuantity, foodId]
    );

    const validReferenceId =
      orderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
        ? orderId
        : null;

    // 3. Log the inventory transaction
    await client.query(
      `INSERT INTO inventory_logs (
        restaurant_id, food_id, change_amount, previous_quantity, new_quantity, reason, reference_id
       ) VALUES ($1, $2, $3, $4, $5, 'ORDER_PLACED', $6)`,
      [restaurantId, foodId, -requestedQuantity, currentQuantity, newQuantity, validReferenceId]
    );

    return { previousQuantity: currentQuantity, newQuantity, restaurantId };
  }

  async replenishStock(
    foodId: string,
    quantityToAdd: number,
    reason: 'ORDER_CANCELLED' | 'RESTOCK' | 'MANUAL_ADJUSTMENT',
    referenceId?: string,
    userId?: string,
    client?: PoolClient
  ): Promise<Inventory> {
    const runner = client || (await query.bind(null));
    
    // Acquire lock and update
    const selectSql = `SELECT id, restaurant_id, quantity FROM inventory WHERE food_id = $1 FOR UPDATE`;
    const lockRes = client ? await client.query(selectSql, [foodId]) : await query(selectSql, [foodId]);
    
    if (lockRes.rows.length === 0) {
      throw new Error(`Inventory not found for food item: ${foodId}`);
    }

    const currentQty = parseInt(lockRes.rows[0].quantity, 10);
    const restId = lockRes.rows[0].restaurant_id;
    const newQty = currentQty + quantityToAdd;

    const updateSql = `
      UPDATE inventory
      SET quantity = $1, last_restocked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE food_id = $2
      RETURNING id, restaurant_id, food_id, quantity, low_stock_threshold, last_restocked_at, created_at, updated_at
    `;
    const updateRes = client
      ? await client.query(updateSql, [newQty, foodId])
      : await query(updateSql, [newQty, foodId]);

    const logSql = `
      INSERT INTO inventory_logs (
        restaurant_id, food_id, change_amount, previous_quantity, new_quantity, reason, reference_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const isUuid = (val?: string) =>
      val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
        ? val
        : null;

    const logParams = [
      restId,
      foodId,
      quantityToAdd,
      currentQty,
      newQty,
      reason,
      isUuid(referenceId),
      isUuid(userId),
    ];
    
    if (client) {
      await client.query(logSql, logParams);
    } else {
      await query(logSql, logParams);
    }

    return this.mapRowToInventory(updateRes.rows[0]);
  }

  async setStock(
    restaurantId: string,
    foodId: string,
    newQuantity: number,
    lowStockThreshold = 5,
    reason: 'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'SPOILAGE' = 'MANUAL_ADJUSTMENT',
    userId?: string
  ): Promise<Inventory> {
    const isUuid = (val?: string) =>
      val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
        ? val
        : null;

    const current = await this.getByFoodId(foodId);
    const prevQty = current ? current.quantity : 0;
    const change = newQuantity - prevQty;

    const res = await query(
      `INSERT INTO inventory (restaurant_id, food_id, quantity, low_stock_threshold, last_restocked_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (food_id) DO UPDATE 
       SET quantity = EXCLUDED.quantity, 
           low_stock_threshold = EXCLUDED.low_stock_threshold, 
           last_restocked_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       RETURNING id, restaurant_id, food_id, quantity, low_stock_threshold, last_restocked_at, created_at, updated_at`,
      [restaurantId, foodId, newQuantity, lowStockThreshold]
    );

    await query(
      `INSERT INTO inventory_logs (
        restaurant_id, food_id, change_amount, previous_quantity, new_quantity, reason, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [restaurantId, foodId, change, prevQty, newQuantity, reason, isUuid(userId)]
    );

    return this.mapRowToInventory(res.rows[0]);
  }

  private mapRowToInventory(row: any): Inventory {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      foodId: row.food_id,
      quantity: parseInt(row.quantity, 10),
      lowStockThreshold: parseInt(row.low_stock_threshold, 10),
      lastRestockedAt: row.last_restocked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
