import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();
const paymentController = new PaymentController();

router.post('/verify', authMiddleware, paymentController.verifyPayment);

router.post(
  '/cash-paid/:orderId',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  paymentController.markCashPaid
);

export default router;
