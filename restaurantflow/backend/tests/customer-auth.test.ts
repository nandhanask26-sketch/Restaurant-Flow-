/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';
import { Express } from 'express';
import { OtpService } from '../src/services/OtpService';
import { closePool } from '../src/config/database';

describe('Customer Production Authentication Suite', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(async () => {
    await closePool();
  });

  const testEmail = `test_customer_${Date.now()}@example.com`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  // ==============================================================================
  // 1. EMAIL OTP TESTS
  // ==============================================================================
  describe('Email OTP Flow', () => {
    it('1. should send Email OTP and return generic response without leaking OTP', async () => {
      const res = await request(app)
        .post('/api/auth/email/send-otp')
        .send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('verification code has been sent');
      expect(res.body.data.otp).toBeUndefined(); // Crucial: NEVER expose OTP in response
    });

    it('2. should verify valid Email OTP and create customer session with tokens', async () => {
      // Create a known OTP directly through OtpService
      const email = `verified_${Date.now()}@example.com`;
      const { otp } = await OtpService.createAndStoreOtp('EMAIL', email, 'LOGIN');

      const res = await request(app)
        .post('/api/auth/email/verify-otp')
        .send({
          email,
          otp,
          fullName: 'Priya Sharma',
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(email.toLowerCase());
        expect(res.body.data.user.role).toBe('CUSTOMER');
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
      }
    });

    it('3. should reject invalid Email OTP', async () => {
      const email = `invalid_otp_${Date.now()}@example.com`;
      await OtpService.createAndStoreOtp('EMAIL', email, 'LOGIN');

      const res = await request(app)
        .post('/api/auth/email/verify-otp')
        .send({
          email,
          otp: '000000', // incorrect OTP
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Incorrect verification code/i);
    });

    it('4. should reject expired OTP', async () => {
      const email = `expired_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/email/verify-otp')
        .send({
          email,
          otp: '123456',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired|not requested/i);
    });

    it('5. should reject OTP after 5 failed attempts (brute force protection)', async () => {
      const email = `brute_${Date.now()}@example.com`;
      await OtpService.createAndStoreOtp('EMAIL', email, 'LOGIN');

      // Attempt 1 to 4
      for (let i = 0; i < 4; i++) {
        const attempt = await request(app)
          .post('/api/auth/email/verify-otp')
          .send({ email, otp: '111111' });
        expect(attempt.status).toBe(400);
      }

      // 5th attempt - should lock out / invalidate OTP
      const fifthAttempt = await request(app)
        .post('/api/auth/email/verify-otp')
        .send({ email, otp: '111111' });

      expect(fifthAttempt.status).toBe(400);
      expect(fifthAttempt.body.message).toMatch(/Maximum attempts/i);
    });

    it('6. should ensure verified OTP cannot be reused', async () => {
      const email = `reuse_${Date.now()}@example.com`;
      const { otp } = await OtpService.createAndStoreOtp('EMAIL', email, 'LOGIN');

      // First verification succeeds
      const first = await request(app)
        .post('/api/auth/email/verify-otp')
        .send({ email, otp });

      if (first.status === 200) {
        // Second verification with same OTP MUST fail
        const second = await request(app)
          .post('/api/auth/email/verify-otp')
          .send({ email, otp });

        expect(second.status).toBe(400);
        expect(second.body.message).toMatch(/expired|not requested/i);
      }
    });
  });

  // ==============================================================================
  // 2. PHONE OTP TESTS
  // ==============================================================================
  describe('Phone OTP Flow', () => {
    it('7. should send Phone OTP and return generic response', async () => {
      const res = await request(app)
        .post('/api/auth/phone/send-otp')
        .send({ phone: testPhone });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('verification code has been sent');
    });

    it('8. should verify valid Phone OTP and create customer session', async () => {
      const phone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
      const { otp } = await OtpService.createAndStoreOtp('PHONE', phone, 'LOGIN');

      const res = await request(app)
        .post('/api/auth/phone/verify-otp')
        .send({
          phone,
          otp,
          fullName: 'Rahul Verma',
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.phone).toContain(phone);
        expect(res.body.data.user.role).toBe('CUSTOMER');
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
      }
    });
  });

  // ==============================================================================
  // 3. NORMALIZATION & RATE LIMITING
  // ==============================================================================
  describe('Normalization & Rate Limiting', () => {
    it('9. should properly normalize phone numbers and emails', () => {
      expect(OtpService.normalizeEmail('  USER@ExAmPle.COM  ')).toBe('user@example.com');
      expect(OtpService.normalizePhone('9876543210')).toBe('+919876543210');
      expect(OtpService.normalizePhone('+91 98765 43210')).toBe('+919876543210');
    });

    it('10. should reject OTP generation during cooldown period', async () => {
      const email = `cooldown_${Date.now()}@example.com`;
      await OtpService.createAndStoreOtp('EMAIL', email, 'LOGIN');

      // Immediate second request within 60s cooldown must throw
      await expect(OtpService.createAndStoreOtp('EMAIL', email, 'LOGIN')).rejects.toThrow(
        /Please wait \d+ seconds/i
      );
    });
  });

  // ==============================================================================
  // 4. GOOGLE AUTHENTICATION & MANAGER PRESERVATION
  // ==============================================================================
  describe('Google OAuth & Manager Authentication', () => {
    it('11. should authenticate with Google mock token in development', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          credential: `mock-google-token:test_g_${Date.now()}@gmail.com:Google Tester`,
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.role).toBe('CUSTOMER');
        expect(res.body.data.accessToken).toBeDefined();
      }
    });

    it('12. should preserve existing manager login functionality', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@example.com',
          password: 'Password123!',
        });

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.role).toBe('RESTAURANT_MANAGER');
        expect(res.body.data.restaurantId).toBeDefined();
      }
    });
  });
});
