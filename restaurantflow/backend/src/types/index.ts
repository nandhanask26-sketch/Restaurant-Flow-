export type UserRole = 'CUSTOMER' | 'RESTAURANT_MANAGER' | 'ADMIN';

export type OrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

export type PreferredTimeType = 'ASAP' | 'SCHEDULED';

export type PaymentMethod = 'UPI' | 'CARD' | 'CASH_ON_DELIVERY' | 'NET_BANKING';

export type PaymentStatus = 'PENDING' | 'PAID' | 'UNPAID' | 'FAILED' | 'REFUNDED';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS' | 'ALL_DAY';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email?: string;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Food {
  id: string;
  restaurantId: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  preparationTimeMinutes: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  inventoryQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: string;
  restaurantId: string;
  foodId: string;
  quantity: number;
  lowStockThreshold: number;
  lastRestockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuSchedule {
  id: string;
  restaurantId: string;
  menuDate: string;
  mealType: MealType;
  title?: string;
  isActive: boolean;
  items?: Food[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  foodId: string;
  foodName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  createdAt: Date;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  userId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderToken: string;
  status: OrderStatus;
  preferredTimeType: PreferredTimeType;
  requestedFoodAt: Date;
  estimatedReadyAt?: Date;
  subtotal: number;
  tax: number;
  totalAmount: number;
  notes?: string;
  cancellationReason?: string;
  items?: OrderItem[];
  payment?: Payment;
  qrCode?: QrCode;
  createdAt: Date;
  confirmedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  restaurantId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentProvider: string;
  status: PaymentStatus;
  transactionId?: string;
  providerResponse?: any;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QrCode {
  id: string;
  orderId: string;
  restaurantId: string;
  verificationCode: string;
  qrDataUrl?: string;
  isScanned: boolean;
  scannedAt?: Date;
  scannedBy?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  restaurantId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}
