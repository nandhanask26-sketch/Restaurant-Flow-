import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/InventoryService';
import { FoodService } from '../services/FoodService';
import { AuditService } from '../services/AuditService';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';

export class InventoryController {
  private inventoryService: InventoryService;
  private foodService: FoodService;
  private auditService: AuditService;

  constructor() {
    this.inventoryService = new InventoryService();
    this.foodService = new FoodService();
    this.auditService = new AuditService();
  }

  getInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = (req.query.restaurantId as string) || req.user?.restaurantId;
      if (!restaurantId) {
        throw new BadRequestError('restaurantId is required');
      }

      const inventory = await this.inventoryService.getInventory(restaurantId);
      sendSuccess(res, inventory, 'Inventory retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId || (req.body.restaurantId as string);
      if (!restaurantId) {
        throw new BadRequestError('Restaurant ID required');
      }

      const foodId = req.params.foodId;
      const { quantity, price, lowStockThreshold, reason } = req.body;

      let updatedFood = null;
      if (price !== undefined) {
        updatedFood = await this.foodService.updateFood(foodId, { price: Number(price) });
      }

      let updatedStock = null;
      if (quantity !== undefined) {
        updatedStock = await this.inventoryService.updateStock(
          restaurantId,
          foodId,
          Number(quantity),
          lowStockThreshold !== undefined ? Number(lowStockThreshold) : 5,
          reason,
          req.user?.userId
        );
      }

      await this.auditService.record('INVENTORY_UPDATED', 'INVENTORY', {
        userId: req.user?.userId,
        restaurantId,
        entityId: foodId,
        metadata: { newQuantity: quantity, newPrice: price, reason },
        ipAddress: req.ip,
      });

      sendSuccess(res, { stock: updatedStock, food: updatedFood }, 'Inventory stock and recipe amount updated');
    } catch (error) {
      next(error);
    }
  };
}
