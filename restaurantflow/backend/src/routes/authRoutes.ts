import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../middleware/validateMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  customerRegisterSchema,
  managerRegisterSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators';

const router = Router();
const authController = new AuthController();

router.post(
  '/register/customer',
  authRateLimiter,
  validate(customerRegisterSchema),
  authController.registerCustomer
);

router.post(
  '/register/manager',
  authRateLimiter,
  validate(managerRegisterSchema),
  authController.registerManager
);

router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

router.post('/otp/send', authRateLimiter, authController.sendLoginOtp);

router.post('/otp/verify', authRateLimiter, authController.verifyLoginOtp);

router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

router.post('/logout', authMiddleware, authController.logout);

router.get('/me', authMiddleware, authController.getProfile);

router.post('/send-security-otp', authMiddleware, authController.sendSecurityOtp);

router.post('/verify-security-otp', authMiddleware, authController.verifySecurityOtp);

router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
