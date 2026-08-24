import { Request, Response, NextFunction } from 'express';
import { MenuService } from '../services/MenuService';
import { AuditService } from '../services/AuditService';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';

export class MenuController {
  private menuService: MenuService;
  private auditService: AuditService;

  constructor() {
    this.menuService = new MenuService();
    this.auditService = new AuditService();
  }

  getDaily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = (req.query.restaurantId as string) || req.user?.restaurantId;
      if (!restaurantId) {
        throw new BadRequestError('restaurantId query parameter is required');
      }

      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const schedules = await this.menuService.getDailyMenus(restaurantId, date);
      sendSuccess(res, schedules, `Menus for date ${date} retrieved`);
    } catch (error) {
      next(error);
    }
  };

  createSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId || req.body.restaurantId;
      if (!restaurantId) {
        throw new BadRequestError('Restaurant ID required');
      }

      const { menuDate, mealType, title, foodIds } = req.body;
      const schedule = await this.menuService.scheduleMenu(
        restaurantId,
        menuDate,
        mealType,
        title,
        foodIds
      );

      await this.auditService.record('MENU_SCHEDULED', 'MENU', {
        userId: req.user?.userId,
        restaurantId,
        entityId: schedule.id,
        metadata: { menuDate, mealType, itemsCount: foodIds.length },
        ipAddress: req.ip,
      });

      sendSuccess(res, schedule, 'Daily menu scheduled successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  deleteSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.menuService.deleteSchedule(req.params.id);
      sendSuccess(res, { deleted: true }, 'Menu schedule removed');
    } catch (error) {
      next(error);
    }
  };
}
