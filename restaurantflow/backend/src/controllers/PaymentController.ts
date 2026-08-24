import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment/PaymentService';
import { AuditService } from '../services/AuditService';
import { sendSuccess } from '../utils/response';

export class PaymentController {
  private paymentService: PaymentService;
  private auditService: AuditService;

  constructor() {
    this.paymentService = new PaymentService();
    this.auditService = new AuditService();
  }

  verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId, transactionId } = req.body;
      const payment = await this.paymentService.verifyPayment(orderId, transactionId);

      await this.auditService.record('PAYMENT_VERIFIED', 'PAYMENT', {
        userId: req.user?.userId,
        restaurantId: payment.restaurantId,
        entityId: payment.id,
        metadata: { orderId, transactionId, amount: payment.amount },
        ipAddress: req.ip,
      });

      sendSuccess(res, payment, 'Payment verified successfully');
    } catch (error) {
      next(error);
    }
  };

  markCashPaid = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = req.params.orderId;
      const managerUserId = req.user!.userId;
      const payment = await this.paymentService.markCashReceived(orderId, managerUserId);

      await this.auditService.record('CASH_PAYMENT_COLLECTED', 'PAYMENT', {
        userId: managerUserId,
        restaurantId: payment.restaurantId,
        entityId: payment.id,
        metadata: { orderId, amount: payment.amount },
        ipAddress: req.ip,
      });

      sendSuccess(res, payment, 'Cash on Delivery payment marked as received');
    } catch (error) {
      next(error);
    }
  };
}
