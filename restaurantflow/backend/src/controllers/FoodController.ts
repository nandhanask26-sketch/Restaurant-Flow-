import { Request, Response, NextFunction } from 'express';
import { FoodService } from '../services/FoodService';
import { AuditService } from '../services/AuditService';
import { sendSuccess } from '../utils/response';
import { ForbiddenError, BadRequestError } from '../utils/errors';
import { emitToRestaurant, emitGlobal } from '../websocket/socketServer';
import { SOCKET_EVENTS } from '../websocket/socketEvents';

export class FoodController {
  private foodService: FoodService;
  private auditService: AuditService;

  constructor() {
    this.foodService = new FoodService();
    this.auditService = new AuditService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = (req.query.restaurantId as string) || req.user?.restaurantId;
      if (!restaurantId) {
        throw new BadRequestError('restaurantId query parameter is required');
      }

      const categoryId = req.query.categoryId as string | undefined;
      const search = req.query.search as string | undefined;
      const onlyAvailable = req.query.onlyAvailable === 'true';

      const foods = await this.foodService.getFoodsByRestaurant(restaurantId, {
        categoryId,
        onlyAvailable,
        search,
      });

      sendSuccess(res, foods, 'Foods retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const food = await this.foodService.getFoodById(req.params.id);
      sendSuccess(res, food, 'Food details retrieved');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId || req.body.restaurantId;
      if (!restaurantId) {
        throw new BadRequestError('Restaurant ID required');
      }

      const food = await this.foodService.createFood(restaurantId, req.body);

      // Real-time broadcast to customers and managers
      emitToRestaurant(restaurantId, SOCKET_EVENTS.MENU_UPDATED, food);
      emitGlobal(SOCKET_EVENTS.MENU_UPDATED, food);

      await this.auditService.record('FOOD_ADDED', 'FOOD', {
        userId: req.user?.userId,
        restaurantId,
        entityId: food.id,
        metadata: { name: food.name, price: food.price },
        ipAddress: req.ip,
      });

      sendSuccess(res, food, 'Food item created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const foodId = req.params.id;
      const existing = await this.foodService.getFoodById(foodId);

      if (req.user?.role === 'RESTAURANT_MANAGER' && req.user.restaurantId !== existing.restaurantId) {
        throw new ForbiddenError('You can only update food items from your restaurant');
      }

      const updated = await this.foodService.updateFood(foodId, req.body);

      // Real-time broadcast to customers and managers
      emitToRestaurant(existing.restaurantId, SOCKET_EVENTS.MENU_UPDATED, updated);
      emitGlobal(SOCKET_EVENTS.MENU_UPDATED, updated);

      await this.auditService.record('FOOD_UPDATED', 'FOOD', {
        userId: req.user?.userId,
        restaurantId: existing.restaurantId,
        entityId: foodId,
        metadata: req.body,
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, 'Food item updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const foodId = req.params.id;
      const existing = await this.foodService.getFoodById(foodId);

      if (req.user?.role === 'RESTAURANT_MANAGER' && req.user.restaurantId !== existing.restaurantId) {
        throw new ForbiddenError('You can only delete food items from your restaurant');
      }

      await this.foodService.deleteFood(foodId);

      // Real-time broadcast to customers and managers
      emitToRestaurant(existing.restaurantId, SOCKET_EVENTS.MENU_UPDATED, { id: foodId, deleted: true });
      emitGlobal(SOCKET_EVENTS.MENU_UPDATED, { id: foodId, deleted: true });

      await this.auditService.record('FOOD_DELETED', 'FOOD', {
        userId: req.user?.userId,
        restaurantId: existing.restaurantId,
        entityId: foodId,
        metadata: { name: existing.name },
        ipAddress: req.ip,
      });

      sendSuccess(res, { deleted: true }, 'Food item deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = (req.query.restaurantId as string) || req.user?.restaurantId;
      if (!restaurantId) {
        throw new BadRequestError('restaurantId is required');
      }
      const categories = await this.foodService.getCategories(restaurantId);
      sendSuccess(res, categories, 'Categories retrieved');
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId || req.body.restaurantId;
      if (!restaurantId) {
        throw new BadRequestError('Restaurant ID required');
      }
      const category = await this.foodService.createCategory(restaurantId, req.body.name);
      sendSuccess(res, category, 'Category created', 201);
    } catch (error) {
      next(error);
    }
  };
}
