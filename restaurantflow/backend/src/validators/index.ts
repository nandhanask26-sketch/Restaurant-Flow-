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

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateRestaurantStatusSchema = z.object({
  isOpen: z.boolean(),
});

export const createFoodSchema = z.object({
  name: z.string().min(1, 'Food name is required').max(150),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  price: z.number().positive('Price must be greater than 0'),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
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
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
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
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'ALL_DAY']),
  title: z.string().optional(),
  foodIds: z.array(z.string().uuid()).min(1, 'At least one food item must be selected'),
});

export const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  preferredTimeType: z.enum(['ASAP', 'SCHEDULED']).default('ASAP'),
  requestedFoodAt: z.string().datetime().or(z.string().min(1)),
  paymentMethod: z.enum(['UPI', 'CARD', 'CASH_ON_DELIVERY', 'NET_BANKING']),
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
    'PREPARING',
    'READY',
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
