import { Request, Response, NextFunction } from 'express';
import { QrService } from '../services/QrService';
import { OrderService } from '../services/OrderService';
import { AuditService } from '../services/AuditService';
import { sendSuccess } from '../utils/response';
import { BadRequestError, ForbiddenError } from '../utils/errors';

export class QrController {
  private qrService: QrService;
  private orderService: OrderService;
  private auditService: AuditService;

  constructor() {
    this.qrService = new QrService();
    this.orderService = new OrderService();
    this.auditService = new AuditService();
  }

  getQrByOrderId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = req.params.orderId;
      const order = await this.orderService.getOrderById(orderId);

      // Access control
      if (req.user?.role === 'CUSTOMER' && order.userId !== req.user.userId) {
        throw new ForbiddenError('Access forbidden');
      }

      const qr = await this.qrService.getQrForOrder(orderId);
      if (!qr) {
        throw new BadRequestError('QR code not available or not yet paid');
      }

      sendSuccess(res, qr, 'QR Code details');
    } catch (error) {
      next(error);
    }
  };

  verifyQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verificationCode } = req.body;
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        throw new ForbiddenError('Manager is not associated with any restaurant');
      }

      const result = await this.qrService.verifyAndRedeemQr(
        verificationCode,
        restaurantId,
        req.user!.userId
      );

      await this.auditService.record('QR_VERIFIED', 'ORDER', {
        userId: req.user!.userId,
        restaurantId,
        entityId: result.order.id,
        metadata: { token: result.order.orderToken, code: verificationCode },
        ipAddress: req.ip,
      });

      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  deliverOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = req.params.id;
      const managerUserId = req.user!.userId;
      const restaurantId = req.user?.restaurantId;

      const order = await this.orderService.getOrderById(orderId);
      if (restaurantId && order.restaurantId !== restaurantId) {
        throw new ForbiddenError('You can only deliver orders from your restaurant');
      }

      const updated = await this.orderService.updateOrderStatus(orderId, 'DELIVERED', {
        managerUserId,
      });

      await this.auditService.record('ORDER_DELIVERED', 'ORDER', {
        userId: managerUserId,
        restaurantId: order.restaurantId,
        entityId: orderId,
        metadata: { token: updated.orderToken },
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, `Order ${updated.orderToken} marked as DELIVERED`);
    } catch (error) {
      next(error);
    }
  };
}
