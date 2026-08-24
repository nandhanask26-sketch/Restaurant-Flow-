import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { updateInventorySchema } from '../validators';

const router = Router();
const inventoryController = new InventoryController();

router.get(
  '/',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  inventoryController.getInventory
);

router.patch(
  '/:foodId',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(updateInventorySchema),
  inventoryController.updateStock
);

export default router;
