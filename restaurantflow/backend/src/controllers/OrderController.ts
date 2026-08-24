import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { OrderRepository } from '../repositories/OrderRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AuditService } from '../services/AuditService';
import { sendSuccess } from '../utils/response';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '../utils/errors';

export class OrderController {
  private orderService: OrderService;
  private orderRepo: OrderRepository;
  private userRepo: UserRepository;
  private auditService: AuditService;

  constructor() {
    this.orderService = new OrderService();
    this.orderRepo = new OrderRepository();
    this.userRepo = new UserRepository();
    this.auditService = new AuditService();
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Please log in to place an order');
      }

      const user = await this.userRepo.findById(req.user.userId);
      if (!user) {
        throw new UnauthorizedError('User account not found');
      }

      const order = await this.orderService.createOrder(
        user.id,
        {
          name: user.fullName,
          email: user.email,
          phone: user.phone,
        },
        req.body
      );

      sendSuccess(res, order, `Order placed successfully! Token: ${order.orderToken}`, 201);
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const isManager = req.user?.role === 'RESTAURANT_MANAGER';
      const restaurantId = isManager
        ? req.user?.restaurantId || (req.query.restaurantId as string)
        : (req.query.restaurantId as string);

      const userId = isManager ? undefined : req.user?.userId;

      const result = await this.orderRepo.findAll({
        restaurantId,
        userId,
        status,
        search,
        page,
        limit,
      });

      sendSuccess(res, result.orders, 'Orders retrieved', 200, {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.orderService.getOrderById(req.params.id);

      // Access control
      if (req.user?.role === 'CUSTOMER' && order.userId !== req.user.userId) {
        throw new ForbiddenError('You can only view your own orders');
      }
      if (req.user?.role === 'RESTAURANT_MANAGER' && order.restaurantId !== req.user.restaurantId) {
        throw new ForbiddenError('You can only view orders for your restaurant');
      }

      sendSuccess(res, order, 'Order details');
    } catch (error) {
      next(error);
    }
  };

  getByToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.params.token;
      const order = await this.orderRepo.findByToken(token);
      if (!order) {
        throw new BadRequestError(`Order with token "${token}" not found`);
      }
      sendSuccess(res, order, 'Order found');
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = req.params.id;
      const { status, cancellationReason } = req.body;

      const updated = await this.orderService.updateOrderStatus(orderId, status, {
        cancellationReason,
        managerUserId: req.user?.userId,
      });

      await this.auditService.record('ORDER_STATUS_CHANGED', 'ORDER', {
        userId: req.user?.userId,
        restaurantId: updated.restaurantId,
        entityId: orderId,
        metadata: { newStatus: status, token: updated.orderToken },
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, `Order status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  };

  getSmartQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId || (req.query.restaurantId as string);
      if (!restaurantId) {
        throw new BadRequestError('Restaurant ID required');
      }

      const queue = await this.orderService.getSmartQueueOrders(restaurantId);
      sendSuccess(res, queue, 'Smart order queue retrieved');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = req.params.id;
      const restaurantId = req.user?.role === 'RESTAURANT_MANAGER' ? req.user.restaurantId : undefined;

      await this.orderService.deleteOrder(orderId, restaurantId);

      await this.auditService.record('ORDER_DELETED', 'ORDER', {
        userId: req.user?.userId,
        restaurantId,
        entityId: orderId,
        ipAddress: req.ip,
      });

      sendSuccess(res, { deleted: true, id: orderId }, 'Order deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId || (req.body.restaurantId as string);
      if (!restaurantId) {
        throw new BadRequestError('Restaurant ID required');
      }

      const { orderIds } = req.body;
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new BadRequestError('orderIds must be a non-empty array of strings');
      }

      const deletedCount = await this.orderService.deleteBulkOrders(orderIds, restaurantId);

      await this.auditService.record('ORDERS_BULK_DELETED', 'ORDER', {
        userId: req.user?.userId,
        restaurantId,
        metadata: { count: deletedCount, orderIds },
        ipAddress: req.ip,
      });

      sendSuccess(res, { deletedCount }, `Successfully deleted ${deletedCount} order(s)`);
    } catch (error) {
      next(error);
    }
  };

  clearHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId || (req.query.restaurantId as string) || (req.body.restaurantId as string);
      if (!restaurantId) {
        throw new BadRequestError('Restaurant ID required');
      }

      const date = (req.query.date as string) || (req.body.date as string); // e.g. 'today' or '2026-08-24'
      const status = (req.query.status as string) || (req.body.status as string); // e.g. 'DELIVERED', 'ALL'

      const deletedCount = await this.orderService.clearOrderHistory(restaurantId, {
        date: date || 'today',
        status,
      });

      await this.auditService.record('ORDERS_HISTORY_CLEARED', 'ORDER', {
        userId: req.user?.userId,
        restaurantId,
        metadata: { date: date || 'today', status: status || 'ALL', count: deletedCount },
        ipAddress: req.ip,
      });

      sendSuccess(res, { deletedCount, date: date || 'today' }, `Cleared ${deletedCount} order(s) for the specified period`);
    } catch (error) {
      next(error);
    }
  };
}
