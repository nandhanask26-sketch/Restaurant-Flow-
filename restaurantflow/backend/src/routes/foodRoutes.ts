import { Router } from 'express';
import { FoodController } from '../controllers/FoodController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { createFoodSchema, updateFoodSchema } from '../validators';

const router = Router();
const foodController = new FoodController();

router.get('/', foodController.getAll);
router.get('/categories', foodController.getCategories);
router.post(
  '/categories',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  foodController.createCategory
);

router.get('/:id', foodController.getById);

router.post(
  '/',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(createFoodSchema),
  foodController.create
);

router.patch(
  '/:id',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  validate(updateFoodSchema),
  foodController.update
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  foodController.delete
);

export default router;
