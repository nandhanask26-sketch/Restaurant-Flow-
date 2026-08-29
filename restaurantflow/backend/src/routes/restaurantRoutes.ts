import { Router } from 'express';
import { RestaurantController } from '../controllers/RestaurantController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { updateRestaurantStatusSchema, updateRestaurantProfileSchema } from '../validators';

const router = Router();
const restaurantController = new RestaurantController();

router.get('/', restaurantController.getAll);
router.get('/:id', restaurantController.getById);
router.get('/:id/status', restaurantController.getStatus);

router.patch(
  '/:id/status',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(updateRestaurantStatusSchema),
  restaurantController.updateStatus
);

router.put(
  '/:id',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(updateRestaurantProfileSchema),
  restaurantController.update
);

router.patch(
  '/:id',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(updateRestaurantProfileSchema),
  restaurantController.update
);

export default router;
