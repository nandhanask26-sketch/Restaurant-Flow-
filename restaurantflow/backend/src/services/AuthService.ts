import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { RestaurantRepository } from '../repositories/RestaurantRepository';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/tokenGenerator';
import { ConflictError, UnauthorizedError, BadRequestError } from '../utils/errors';
import { User, UserRole } from '../types';
import { getClient } from '../config/database';
import { EmailService } from './EmailService';
import { SmsService } from './SmsService';

export class AuthService {
  private userRepo: UserRepository;
  private restaurantRepo: RestaurantRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.restaurantRepo = new RestaurantRepository();
  }

  async registerCustomer(data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // 1. Check duplicate email or phone
    const existingEmail = await this.userRepo.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError('A user with this email address already exists.');
    }
    const existingPhone = await this.userRepo.findByPhone(data.phone);
    if (existingPhone) {
      throw new ConflictError('A user with this phone number already exists.');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 3. Create user
    const user = await this.userRepo.create({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: 'CUSTOMER',
    });

    // 4. Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 5. Store refresh token hash
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepo.saveRefreshToken(user.id, hashToken(refreshToken), expiresAt);

    return { user, accessToken, refreshToken };
  }

  async registerManager(data: {
    managerName: string;
    email: string;
    phone: string;
    password: string;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    restaurantDescription?: string;
    openingTime?: string;
    closingTime?: string;
  }): Promise<{ user: User; restaurantId: string; accessToken: string; refreshToken: string }> {
    const existingEmail = await this.userRepo.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError('A manager with this email address already exists.');
    }
    const existingPhone = await this.userRepo.findByPhone(data.phone);
    if (existingPhone) {
      throw new ConflictError('A manager with this phone number already exists.');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create Manager User
      const user = await this.userRepo.create(
        {
          fullName: data.managerName,
          email: data.email,
          phone: data.phone,
          passwordHash,
          role: 'RESTAURANT_MANAGER',
        },
        client
      );

      // Create Restaurant linked to Manager
      const restaurant = await this.restaurantRepo.create(
        {
          name: data.restaurantName,
          description: data.restaurantDescription,
          address: data.restaurantAddress,
          phone: data.restaurantPhone,
          openingTime: data.openingTime,
          closingTime: data.closingTime,
        },
        user.id,
        client
      );

      await client.query('COMMIT');

      // Tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        restaurantId: restaurant.id,
      });
      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        restaurantId: restaurant.id,
      });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.userRepo.saveRefreshToken(user.id, hashToken(refreshToken), expiresAt);

      return { user, restaurantId: restaurant.id, accessToken, refreshToken };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; restaurantId?: string; accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findByEmail(email, true);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    let isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Fallback: check lowercase/uppercase variations for demo convenience
      isMatch = await bcrypt.compare(password.toLowerCase(), user.passwordHash) ||
                await bcrypt.compare(password.charAt(0).toUpperCase() + password.slice(1), user.passwordHash);
    }
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    let restaurantId: string | undefined;
    if (user.role === 'RESTAURANT_MANAGER') {
      const rest = await this.restaurantRepo.findByManagerUserId(user.id);
      restaurantId = rest ? rest.id : undefined;
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepo.saveRefreshToken(user.id, hashToken(refreshToken), expiresAt);

    const { passwordHash: _, ...cleanUser } = user;
    return { user: cleanUser as User, restaurantId, accessToken, refreshToken };
  }

  async refreshAccessToken(
    oldRefreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: any;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenH = hashToken(oldRefreshToken);
    const tokenRecord = await this.userRepo.findRefreshToken(tokenH);

    if (!tokenRecord) {
      throw new UnauthorizedError('Refresh token not recognized');
    }

    // Token reuse detection (Security feature)
    if (tokenRecord.isRevoked) {
      await this.userRepo.revokeAllUserRefreshTokens(payload.userId);
      throw new UnauthorizedError('Revoked token reuse detected. Please log in again.');
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Rotate refresh token
    const newPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
      restaurantId: payload.restaurantId,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);
    const newHash = hashToken(newRefreshToken);

    await this.userRepo.revokeRefreshToken(tokenH, newHash);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepo.saveRefreshToken(payload.userId, newHash, expiresAt);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.userRepo.revokeRefreshToken(hashToken(refreshToken));
    } else {
      await this.userRepo.revokeAllUserRefreshTokens(userId);
    }
  }

  // Security Verification OTP Cache (5 min TTL)
  private static otpCache = new Map<
    string,
    { code: string; expiresAt: number; channel: 'EMAIL' | 'PHONE'; target: string }
  >();

  async sendSecurityOtp(
    userId: string,
    channel: 'EMAIL' | 'PHONE',
    target: string
  ): Promise<{ channel: 'EMAIL' | 'PHONE'; maskedTarget: string; previewUrl?: string; code?: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    const cleanInput = target.trim();

    if (channel === 'EMAIL') {
      if (cleanInput.toLowerCase() !== user.email.toLowerCase()) {
        throw new BadRequestError(
          'Verification Failed: Only the registered account email is accepted. Fake or unverified emails are strictly rejected.'
        );
      }
    } else if (channel === 'PHONE') {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      const userPhoneClean = user.phone.replace(/\D/g, '');
      if (!cleanPhone.endsWith(userPhoneClean) && !userPhoneClean.endsWith(cleanPhone)) {
        throw new BadRequestError(
          'Verification Failed: Only the registered account phone number is accepted. Fake or unverified numbers are strictly rejected.'
        );
      }
    }

    // Generate authoritative 6-digit secure code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    AuthService.otpCache.set(userId, { code, expiresAt, channel, target: cleanInput });

    if (channel === 'EMAIL') {
      await EmailService.sendSecurityOtpEmail(user.email, user.fullName, code);
    } else if (channel === 'PHONE') {
      await SmsService.sendOtpSms(user.phone, code);
    }

    console.log(`\n========================================`);
    console.log(`[AUTHENTICATION & SECURITY DISPATCH]`);
    console.log(`Channel: ${channel}`);
    console.log(`Dispatched to: ${cleanInput}`);
    console.log(`6-Digit Verification Code: ${code}`);
    console.log(`Expires in: 5 minutes`);
    console.log(`========================================\n`);

    // Mask the target for privacy
    let maskedTarget = cleanInput;
    if (channel === 'EMAIL') {
      const [name, domain] = cleanInput.split('@');
      maskedTarget = `${name.slice(0, 2)}••••@${domain}`;
    } else {
      maskedTarget = `••••••${cleanInput.slice(-4)}`;
    }

    // Never return the raw code to the client
    return { channel, maskedTarget };
  }

  async verifySecurityOtp(userId: string, code: string): Promise<boolean> {
    const record = AuthService.otpCache.get(userId);
    if (!record) {
      throw new BadRequestError('No active verification code found. Please request a new code.');
    }

    if (Date.now() > record.expiresAt) {
      AuthService.otpCache.delete(userId);
      throw new BadRequestError('Verification code has expired. Please request a new code.');
    }

    if (record.code !== code.trim()) {
      throw new BadRequestError('Invalid verification code. Please check and try again.');
    }

    // Clear after successful verification
    AuthService.otpCache.delete(userId);
    return true;
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.updatePassword(userId, passwordHash);
    await this.userRepo.revokeAllUserRefreshTokens(userId);
  }
}
