import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();
const analyticsController = new AnalyticsController();

router.get(
  '/dashboard',
  authMiddleware,
  requireRole('RESTAURANT_MANAGER', 'ADMIN'),
  analyticsController.getDashboardData
);

export default router;
