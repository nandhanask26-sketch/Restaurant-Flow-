import { Request, Response, NextFunction } from 'express';
import { RestaurantService } from '../services/RestaurantService';
import { AuditService } from '../services/AuditService';
import { sendSuccess } from '../utils/response';
import { ForbiddenError } from '../utils/errors';

export class RestaurantController {
  private restaurantService: RestaurantService;
  private auditService: AuditService;

  constructor() {
    this.restaurantService = new RestaurantService();
    this.auditService = new AuditService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurants = await this.restaurantService.getAllRestaurants();
      sendSuccess(res, restaurants, 'Restaurants retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurant = await this.restaurantService.getRestaurantById(req.params.id);
      sendSuccess(res, restaurant, 'Restaurant details retrieved');
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await this.restaurantService.getRestaurantStatus(req.params.id);
      sendSuccess(res, status, 'Restaurant status retrieved');
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.params.id;
      const { isOpen } = req.body;

      if (req.user?.role === 'RESTAURANT_MANAGER' && req.user.restaurantId !== restaurantId) {
        throw new ForbiddenError('You can only update status for your assigned restaurant');
      }

      const updated = await this.restaurantService.setRestaurantStatus(restaurantId, isOpen);

      await this.auditService.record(
        isOpen ? 'RESTAURANT_OPENED' : 'RESTAURANT_CLOSED',
        'RESTAURANT',
        {
          userId: req.user?.userId,
          restaurantId,
          entityId: restaurantId,
          metadata: { isOpen },
          ipAddress: req.ip,
        }
      );

      sendSuccess(
        res,
        updated,
        `Restaurant is now ${isOpen ? 'OPEN' : 'CLOSED'}`
      );
    } catch (error) {
      next(error);
    }
  };
}
