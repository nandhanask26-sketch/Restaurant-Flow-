import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  getDashboardData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId || (req.query.restaurantId as string);
      if (!restaurantId) {
        throw new BadRequestError('Restaurant ID required');
      }

      const analytics = await this.analyticsService.getRestaurantAnalytics(restaurantId);
      sendSuccess(res, analytics, 'Analytics data retrieved');
    } catch (error) {
      next(error);
    }
  };
}
