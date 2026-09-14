import { z } from 'zod';

export const customerRegisterSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const managerRegisterSchema = z
  .object({
    managerName: z.string().min(2, 'Manager name must be at least 2 characters').max(120),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100),
    confirmPassword: z.string(),
    restaurantName: z.string().min(2, 'Restaurant name is required').max(150),
    restaurantAddress: z.string().min(5, 'Restaurant address is required'),
    restaurantPhone: z.string().min(10, 'Restaurant phone is required'),
    restaurantDescription: z.string().optional(),
    openingTime: z.string().default('08:00'),
    closingTime: z.string().default('22:00'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const sendEmailOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits'),
  fullName: z.string().min(2).max(120).optional(),
});

export const sendPhoneOtpSchema = z.object({
  phone: z.string().min(7, 'Please enter a valid mobile number').max(20, 'Phone number is too long'),
});

export const verifyPhoneOtpSchema = z.object({
  phone: z.string().min(7, 'Please enter a valid mobile number').max(20),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits'),
  fullName: z.string().min(2).max(120).optional(),
});

export const googleAuthSchema = z.object({
  credential: z.string().optional(),
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  googleId: z.string().optional(),
});

export const sendLoginOtpSchema = z.object({
  identifier: z.string().min(3, 'Please enter a valid email or phone number'),
});

export const verifyLoginOtpSchema = z.object({
  identifier: z.string().min(3, 'Please enter a valid email or phone number'),
  code: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits').optional(),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits').optional(),
  fullName: z.string().optional(),
}).refine(data => data.code || data.otp, {
  message: 'Verification code is required',
  path: ['code'],
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateRestaurantStatusSchema = z.object({
  isOpen: z.boolean(),
});

export const updateRestaurantProfileSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(150).optional(),
  description: z.string().max(1000).optional().nullable(),
  address: z.string().min(5, 'Address must be at least 5 characters').optional(),
  phone: z.string().min(7, 'Valid phone number is required').max(30).optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  upiId: z.string().max(100).optional().nullable(),
  upiName: z.string().max(150).optional().nullable(),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
  imageUrl: z.string().optional().nullable(),
  qrCodeUrl: z.string().optional().nullable(),
  isOpen: z.boolean().optional(),
});

export const createFoodSchema = z.object({
  name: z.string().min(1, 'Food name is required').max(150),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  price: z.number().positive('Price must be greater than 0'),
  imageUrl: z.string().optional().nullable(),
  preparationTimeMinutes: z.number().int().min(1).default(15),
  isAvailable: z.boolean().default(true),
  isVegetarian: z.boolean().default(false),
  initialStock: z.number().int().min(0).default(20),
});

export const updateFoodSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  price: z.number().positive().optional(),
  imageUrl: z.string().optional().nullable(),
  preparationTimeMinutes: z.number().int().min(1).optional(),
  isAvailable: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
});

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative').optional(),
  price: z.number().positive('Price must be greater than 0').optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  reason: z.enum(['RESTOCK', 'MANUAL_ADJUSTMENT', 'SPOILAGE']).default('MANUAL_ADJUSTMENT'),
});

export const createMenuScheduleSchema = z.object({
  menuDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'BEVERAGES', 'ALL_DAY']),
  title: z.string().optional(),
  foodIds: z.array(z.string().uuid()).min(1, 'At least one food item must be selected'),
});

export const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  preferredTimeType: z.enum(['ASAP', 'SCHEDULED']).default('ASAP'),
  requestedFoodAt: z.string().datetime().or(z.string().min(1)),
  paymentMethod: z.enum(['UPI', 'CARD', 'CASH_ON_DELIVERY', 'NET_BANKING']),
  transactionId: z.string().min(4, 'UPI Reference / UTR Number must be at least 4 characters').max(100).optional(),
  paymentStatus: z.enum(['PAID', 'FAILED', 'REJECTED', 'UNPAID']).optional(),
  notes: z.string().max(300).optional(),
  items: z
    .array(
      z.object({
        foodId: z.string().uuid(),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'Order must contain at least 1 food item'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'CREATED',
    'PAYMENT_PENDING',
    'CONFIRMED',
    'DELIVERED',
    'CANCELLED',
    'PAYMENT_FAILED',
  ]),
  cancellationReason: z.string().optional(),
});

export const verifyQrSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
});

export const markCodPaidSchema = z.object({
  notes: z.string().optional(),
});
