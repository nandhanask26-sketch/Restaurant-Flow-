import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { UserRole } from '../types';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  restaurantId?: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: (env.JWT_ACCESS_EXPIRES_IN || '90d') as any,
  });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: (env.JWT_REFRESH_EXPIRES_IN || '365d') as any,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateVerificationCode(orderId: string): string {
  const randomBytes = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `VERIFY-${orderId.substring(0, 8).toUpperCase()}-${randomBytes}`;
}

export function getPassOtp(code?: string, orderId?: string): string {
  if (code) {
    const match = code.match(/VERIFY-(\d{6})/i);
    if (match) return match[1];
  }

  const seed = (code || orderId || 'NALAN-ORDER').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) + hash + seed.charCodeAt(i);
  }
  const num = (Math.abs(hash) % 900000) + 100000;
  return num.toString();
}

