import { Router } from 'express';
import { MenuController } from '../controllers/MenuController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { createMenuScheduleSchema } from '../validators';

const router = Router();
const menuController = new MenuController();

router.get('/daily', menuController.getDaily);

router.post(
  '/schedule',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(createMenuScheduleSchema),
  menuController.createSchedule
);

router.delete(
  '/schedule/:id',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  menuController.deleteSchedule
);

export default router;
