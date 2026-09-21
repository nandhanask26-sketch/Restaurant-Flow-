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
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  googleAuthSchema,
  sendLoginOtpSchema,
  verifyLoginOtpSchema,
} from '../validators';

const router = Router();
const authController = new AuthController();

// 1. Email OTP Endpoints
router.post(
  '/email/send-otp',
  authRateLimiter,
  validate(sendEmailOtpSchema),
  authController.sendEmailOtp
);

router.post(
  '/email/verify-otp',
  authRateLimiter,
  validate(verifyEmailOtpSchema),
  authController.verifyEmailOtp
);

// 2. Phone OTP Endpoints
router.post(
  '/phone/send-otp',
  authRateLimiter,
  validate(sendPhoneOtpSchema),
  authController.sendPhoneOtp
);

router.post(
  '/phone/verify-otp',
  authRateLimiter,
  validate(verifyPhoneOtpSchema),
  authController.verifyPhoneOtp
);

// 3. Google OAuth Endpoint
router.post(
  '/google',
  authRateLimiter,
  validate(googleAuthSchema),
  authController.googleAuth
);

// 4. Legacy / Unified OTP Endpoints
router.post(
  '/otp/send',
  authRateLimiter,
  validate(sendLoginOtpSchema),
  authController.sendLoginOtp
);

router.post(
  '/otp/verify',
  authRateLimiter,
  validate(verifyLoginOtpSchema),
  authController.verifyLoginOtp
);

// 5. Traditional Password Endpoints
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

// 6. Token Management
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getProfile);

// 7. Security OTP & Password Management
router.post('/send-security-otp', authMiddleware, authController.sendSecurityOtp);
router.post('/verify-security-otp', authMiddleware, authController.verifySecurityOtp);
router.post('/change-password', authMiddleware, authController.changePassword);

// 8. Live Diagnostics
router.get('/email-diagnostic', authController.emailDiagnostic);

export default router;
