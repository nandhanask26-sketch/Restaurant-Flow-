import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { QrController } from '../controllers/QrController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { createOrderSchema, updateOrderStatusSchema, verifyQrSchema } from '../validators';

const router = Router();
const orderController = new OrderController();
const qrController = new QrController();

router.get('/', authMiddleware, orderController.getAll);
router.get('/smart-queue', authMiddleware, requireRole('RESTAURANT_MANAGER', 'ADMIN'), orderController.getSmartQueue);
router.get('/token/:token', authMiddleware, orderController.getByToken);
router.get('/:id', authMiddleware, orderController.getById);

router.post('/', authMiddleware, validate(createOrderSchema), orderController.create);

router.patch(
  '/:id/status',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(updateOrderStatusSchema),
  orderController.updateStatus
);

router.post(
  '/:id/verify-qr',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(verifyQrSchema),
  qrController.verifyQr
);

router.post(
  '/:id/deliver',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  qrController.deliverOrder
);

router.delete(
  '/clear-history',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  orderController.clearHistory
);

router.post(
  '/bulk-delete',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  orderController.bulkDelete
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  orderController.delete
);

export default router;
