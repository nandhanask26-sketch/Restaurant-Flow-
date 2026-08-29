import crypto from 'crypto';
import { cacheService } from '../config/redis';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

export interface OtpRecord {
  otpHash: string;
  attempts: number;
  purpose: string;
  createdAt: number;
  expiresAt: number;
}

export type OtpChannel = 'EMAIL' | 'PHONE';

export class OtpService {
  /**
   * Normalizes an email address to lowercase and trimmed format
   */
  static normalizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new BadRequestError('A valid email address is required.');
    }
    return email.trim().toLowerCase();
  }

  /**
   * Normalizes a phone number to standard format (+91 for 10-digit Indian numbers or standard international)
   */
  static normalizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      throw new BadRequestError('A valid phone number is required.');
    }
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      throw new BadRequestError('Please enter a valid phone number (7 to 15 digits).');
    }

    if (cleanDigits.length === 10) {
      return `+91${cleanDigits}`;
    }
    if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      return `+${cleanDigits}`;
    }
    return `+${cleanDigits}`;
  }

  /**
   * Generates a cryptographically secure 6-digit OTP using Node.js crypto
   */
  static generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Hashes the 6-digit OTP using SHA-256 for secure storage
   */
  static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
  }

  /**
   * Gets Redis key for OTP storage
   */
  private static getOtpKey(channel: OtpChannel, normalizedIdentifier: string): string {
    return `otp:${channel.toLowerCase()}:${normalizedIdentifier}`;
  }

  /**
   * Gets Redis key for resend cooldown
   */
  private static getCooldownKey(channel: OtpChannel, normalizedIdentifier: string): string {
    return `cooldown:otp:${channel.toLowerCase()}:${normalizedIdentifier}`;
  }

  /**
   * Gets Redis key for rate limiting OTP generation attempts
   */
  private static getRateLimitKey(channel: OtpChannel, normalizedIdentifier: string): string {
    return `ratelimit:otp:${channel.toLowerCase()}:${normalizedIdentifier}`;
  }

  /**
   * Checks rate limits and generates a new OTP record in Redis
   */
  static async createAndStoreOtp(
    channel: OtpChannel,
    identifier: string,
    purpose: string = 'LOGIN'
  ): Promise<{ otp: string; normalizedIdentifier: string }> {
    const normalizedIdentifier =
      channel === 'EMAIL' ? this.normalizeEmail(identifier) : this.normalizePhone(identifier);

    const cooldownKey = this.getCooldownKey(channel, normalizedIdentifier);
    const inCooldown = await cacheService.get(cooldownKey);
    if (inCooldown) {
      throw new BadRequestError(
        `Please wait ${env.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new verification code.`
      );
    }

    const rateLimitKey = this.getRateLimitKey(channel, normalizedIdentifier);
    const countStr = await cacheService.get(rateLimitKey);
    const currentCount = countStr ? parseInt(countStr, 10) : 0;
    if (currentCount >= 5) {
      throw new BadRequestError(
        'Too many OTP requests for this account. Please try again after 10 minutes.'
      );
    }

    // Generate secure 6-digit OTP
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const ttlSeconds = env.OTP_EXPIRY_SECONDS || 300;
    const now = Date.now();

    const record: OtpRecord = {
      otpHash,
      attempts: 0,
      purpose,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    };

    const otpKey = this.getOtpKey(channel, normalizedIdentifier);
    await cacheService.set(otpKey, JSON.stringify(record), ttlSeconds);

    // Set cooldown (e.g. 60 seconds)
    await cacheService.set(cooldownKey, '1', env.OTP_RESEND_COOLDOWN_SECONDS || 60);

    // Increment 10-minute rate limit window
    await cacheService.set(rateLimitKey, (currentCount + 1).toString(), 600);

    return { otp, normalizedIdentifier };
  }

  /**
   * Verifies the provided OTP against the securely hashed value in Redis
   */
  static async verifyOtp(
    channel: OtpChannel,
    identifier: string,
    providedOtp: string,
    purpose: string = 'LOGIN'
  ): Promise<{ isValid: boolean; normalizedIdentifier: string }> {
    if (!providedOtp || providedOtp.trim().length !== 6) {
      throw new BadRequestError('Please provide a valid 6-digit verification code.');
    }

    const normalizedIdentifier =
      channel === 'EMAIL' ? this.normalizeEmail(identifier) : this.normalizePhone(identifier);

    const otpKey = this.getOtpKey(channel, normalizedIdentifier);
    const rawData = await cacheService.get(otpKey);

    if (!rawData) {
      throw new BadRequestError('Verification code has expired or was not requested. Please request a new code.');
    }

    let record: OtpRecord;
    try {
      record = JSON.parse(rawData);
    } catch {
      await cacheService.del(otpKey);
      throw new BadRequestError('Invalid OTP session state. Please request a new code.');
    }

    if (Date.now() > record.expiresAt) {
      await cacheService.del(otpKey);
      throw new BadRequestError('Verification code has expired. Please request a new code.');
    }

    const maxAttempts = env.OTP_MAX_ATTEMPTS || 5;
    if (record.attempts >= maxAttempts) {
      await cacheService.del(otpKey);
      throw new BadRequestError('Too many invalid attempts. This verification code is no longer valid.');
    }

    const providedHash = this.hashOtp(providedOtp);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(providedHash, 'utf8'),
      Buffer.from(record.otpHash, 'utf8')
    );

    if (!isMatch) {
      record.attempts += 1;
      if (record.attempts >= maxAttempts) {
        await cacheService.del(otpKey);
        throw new BadRequestError(
          `Incorrect verification code. Maximum attempts (${maxAttempts}) exceeded. Please request a new code.`
        );
      } else {
        const remainingTtl = Math.max(1, Math.floor((record.expiresAt - Date.now()) / 1000));
        await cacheService.set(otpKey, JSON.stringify(record), remainingTtl);
        throw new BadRequestError(
          `Incorrect verification code. ${maxAttempts - record.attempts} attempt(s) remaining.`
        );
      }
    }

    // Atomic invalidation: verified OTP can NEVER be reused
    await cacheService.del(otpKey);

    return { isValid: true, normalizedIdentifier };
  }

  /**
   * Masks email or phone number for safe display on client UI
   */
  static maskIdentifier(channel: OtpChannel, normalizedIdentifier: string): string {
    if (channel === 'EMAIL') {
      const [name, domain] = normalizedIdentifier.split('@');
      if (!name || !domain) return normalizedIdentifier;
      const visible = name.slice(0, Math.min(2, name.length));
      return `${visible}••••@${domain}`;
    } else {
      const clean = normalizedIdentifier.replace(/\D/g, '');
      return `••••••${clean.slice(-4)}`;
    }
  }
}
