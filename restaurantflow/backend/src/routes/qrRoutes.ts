import { Router } from 'express';
import { QrController } from '../controllers/QrController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { verifyQrSchema } from '../validators';

const router = Router();
const qrController = new QrController();

router.get('/order/:orderId', authMiddleware, qrController.getQrByOrderId);

router.post(
  '/verify',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(verifyQrSchema),
  qrController.verifyQr
);

export default router;
