import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/restaurantflow'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development-access-secret-32-chars-minimum-key!'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development-refresh-secret-32-chars-minimum-key!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay', 'stripe']).default('mock'),
  LOG_LEVEL: z.string().default('info'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),

  // OTP Configuration
  OTP_EXPIRY_SECONDS: z.string().transform((val) => parseInt(val, 10)).default('300'),
  OTP_MAX_ATTEMPTS: z.string().transform((val) => parseInt(val, 10)).default('5'),
  OTP_RESEND_COOLDOWN_SECONDS: z.string().transform((val) => parseInt(val, 10)).default('30'),

  // SMS Gateway Configuration (Fast2SMS / Twilio / auto fallback)
  FAST2SMS_API_KEY: z.string().optional().default(''),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_PHONE_NUMBER: z.string().optional().default(''),

  // Email Gateway Configuration (Gmail / SMTP / Ethereal fallback)
  GMAIL_USER: z.string().optional().default(''),
  GMAIL_APP_PASSWORD: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_SECURE: z.string().optional().default('false'),
  EMAIL_FROM: z.string().optional().default('login@restaurantflow.com'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
