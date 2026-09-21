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

  // ==============================================================================
  // 1. EMAIL OTP ENDPOINTS
  // ==============================================================================

  sendEmailOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await this.authService.sendEmailOtp(email);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  verifyEmailOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp, fullName } = req.body;
      const result = await this.authService.verifyEmailOtp(email, otp, fullName);

      await this.auditService.record('CUSTOMER_EMAIL_OTP_LOGIN', 'USER', {
        userId: result.user.id,
        metadata: {
          email: result.user.email,
          isNewUser: result.isNewUser,
        },
        ipAddress: req.ip,
      });

      sendSuccess(
        res,
        result,
        result.isNewUser ? 'Welcome to RestaurantFlow! Account created successfully.' : 'Login verified successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // ==============================================================================
  // 2. PHONE OTP ENDPOINTS
  // ==============================================================================

  sendPhoneOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone } = req.body;
      const result = await this.authService.sendPhoneOtp(phone);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  verifyPhoneOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, otp, fullName } = req.body;
      const result = await this.authService.verifyPhoneOtp(phone, otp, fullName);

      await this.auditService.record('CUSTOMER_PHONE_OTP_LOGIN', 'USER', {
        userId: result.user.id,
        metadata: {
          phone: result.user.phone,
          isNewUser: result.isNewUser,
        },
        ipAddress: req.ip,
      });

      sendSuccess(
        res,
        result,
        result.isNewUser ? 'Welcome to RestaurantFlow! Account created successfully.' : 'Login verified successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // ==============================================================================
  // 3. GOOGLE OAUTH ENDPOINT
  // ==============================================================================

  googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.authenticateWithGoogle(req.body);

      await this.auditService.record('CUSTOMER_GOOGLE_LOGIN', 'USER', {
        userId: result.user.id,
        metadata: {
          email: result.user.email,
          isNewUser: result.isNewUser,
        },
        ipAddress: req.ip,
      });

      sendSuccess(res, result, 'Signed in with Google successfully');
    } catch (error) {
      next(error);
    }
  };

  // ==============================================================================
  // 4. EXISTING AUTH METHODS
  // ==============================================================================

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

  loginGoogle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return this.googleAuth(req, res, next);
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
      const { identifier, code, otp, fullName } = req.body;
      const activeCode = code || otp;
      const result = await this.authService.verifyLoginOtp(identifier, activeCode, fullName);
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

  emailDiagnostic = async (req: Request, res: Response): Promise<void> => {
    const net = await import('net');
    const { query: dbQuery } = await import('../config/database');
    const { env: configEnv } = await import('../config/env');

    const result: any = {
      nodeEnv: configEnv.NODE_ENV,
      hasGmailUser: !!configEnv.GMAIL_USER,
      hasGmailPassword: !!configEnv.GMAIL_APP_PASSWORD,
      hasGoogleGmailOAuth: !!(configEnv.GOOGLE_GMAIL_CLIENT_ID && configEnv.GOOGLE_GMAIL_REFRESH_TOKEN),
      hasGoogleLoginClientId: !!configEnv.GOOGLE_CLIENT_ID,
      hasResendApiKey: !!configEnv.RESEND_API_KEY,
      hasBrevoApiKey: !!configEnv.BREVO_API_KEY,
    };

    // 1. Check database users table columns
    try {
      const colCheck = await dbQuery(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;`
      );
      result.userColumns = colCheck.rows.map((r: any) => r.column_name);
    } catch (dbErr: any) {
      result.dbError = dbErr.message;
    }

    // 2. Test TCP to smtp.gmail.com:587 (STARTTLS)
    try {
      result.smtp587 = await new Promise<string>((resolve) => {
        const s = net.createConnection(587, 'smtp.gmail.com');
        s.setTimeout(3500);
        s.on('connect', () => { s.destroy(); resolve('CONNECTED_OK'); });
        s.on('timeout', () => { s.destroy(); resolve('CONNECTION_TIMEOUT'); });
        s.on('error', (e: any) => { resolve(`ERROR: ${e.message}`); });
      });
    } catch (e: any) {
      result.smtp587 = e.message;
    }

    // 3. Test TCP to smtp.gmail.com:465 (SSL)
    try {
      result.smtp465 = await new Promise<string>((resolve) => {
        const s = net.createConnection(465, 'smtp.gmail.com');
        s.setTimeout(3500);
        s.on('connect', () => { s.destroy(); resolve('CONNECTED_OK'); });
        s.on('timeout', () => { s.destroy(); resolve('CONNECTION_TIMEOUT'); });
        s.on('error', (e: any) => { resolve(`ERROR: ${e.message}`); });
      });
    } catch (e: any) {
      result.smtp465 = e.message;
    }

    res.json({ success: true, data: result });
  };
}
