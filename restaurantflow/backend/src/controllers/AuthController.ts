import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AuditService } from '../services/AuditService';
import { sendSuccess } from '../utils/response';

export class AuthController {
  private authService: AuthService;
  private auditService: AuditService;

  constructor() {
    this.authService = new AuthService();
    this.auditService = new AuditService();
  }

  registerCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.registerCustomer(req.body);
      sendSuccess(res, result, 'Customer registered successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  registerManager = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.registerManager(req.body);
      await this.auditService.record('MANAGER_REGISTERED', 'USER', {
        userId: result.user.id,
        restaurantId: result.restaurantId,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Manager and restaurant registered successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);

      if (result.user.role === 'RESTAURANT_MANAGER' && result.restaurantId) {
        await this.auditService.record('MANAGER_LOGIN', 'USER', {
          userId: result.user.id,
          restaurantId: result.restaurantId,
          ipAddress: req.ip,
        });
      }

      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  sendLoginOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { identifier } = req.body;
      const result = await this.authService.sendLoginOtp(identifier);
      sendSuccess(res, result, `Verification code dispatched to your ${result.channel.toLowerCase()}`);
    } catch (error) {
      next(error);
    }
  };

  verifyLoginOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { identifier, code, fullName } = req.body;
      const result = await this.authService.verifyLoginOtp(identifier, code, fullName);
      sendSuccess(
        res,
        result,
        result.isNewUser ? 'Welcome to RestaurantFlow! Account created successfully.' : 'Login verified successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshAccessToken(refreshToken);
      sendSuccess(res, tokens, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user) {
        const { refreshToken } = req.body;
        await this.authService.logout(req.user.userId, refreshToken);
      }
      sendSuccess(res, { loggedOut: true }, 'Logout successful');
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, req.user, 'Profile retrieved');
    } catch (error) {
      next(error);
    }
  };

  sendSecurityOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { channel, target } = req.body;
      const result = await this.authService.sendSecurityOtp(req.user!.userId, channel, target);
      sendSuccess(res, result, `Security code dispatched to your ${channel.toLowerCase()}`);
    } catch (error) {
      next(error);
    }
  };

  verifySecurityOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.body;
      const verified = await this.authService.verifySecurityOtp(req.user!.userId, code);
      sendSuccess(res, { verified }, 'Identity verified successfully');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { newPassword } = req.body;
      await this.authService.changePassword(req.user!.userId, newPassword);
      sendSuccess(res, { success: true }, 'Password updated successfully');
    } catch (error) {
      next(error);
    }
  };
}
