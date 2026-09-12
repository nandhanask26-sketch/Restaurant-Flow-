export type UserRole = 'CUSTOMER' | 'RESTAURANT_MANAGER' | 'ADMIN';

export type OrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

export type PreferredTimeType = 'ASAP' | 'SCHEDULED';
export type PaymentMethod = 'UPI' | 'CARD' | 'CASH_ON_DELIVERY' | 'NET_BANKING';
export type PaymentStatus = 'PENDING' | 'PAID' | 'UNPAID' | 'FAILED' | 'REFUNDED';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS' | 'BEVERAGES' | 'ALL_DAY';

export type AuthProvider = 'PASSWORD' | 'GOOGLE' | 'EMAIL_OTP' | 'PHONE_OTP';

export interface User {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isActive?: boolean;
  avatarUrl?: string;
  googleId?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  authProvider?: AuthProvider;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email?: string;
  upiId?: string;
  upiName?: string;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  imageUrl?: string;
  qrCodeUrl?: string;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
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
}

export interface InventoryItem {
  id: string;
  restaurantId: string;
  foodId: string;
  foodName: string;
  categoryName?: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  lastRestockedAt?: string;
}

export interface MenuSchedule {
  id: string;
  restaurantId: string;
  menuDate: string;
  mealType: MealType;
  title?: string;
  isActive: boolean;
  items?: Food[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  foodId: string;
  foodName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
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
  paidAt?: string;
}

export interface QrCode {
  id: string;
  orderId: string;
  restaurantId: string;
  verificationCode: string;
  qrDataUrl?: string;
  isScanned: boolean;
  scannedAt?: string;
  expiresAt: string;
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
  requestedFoodAt: string;
  estimatedReadyAt?: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  notes?: string;
  cancellationReason?: string;
  items?: OrderItem[];
  paymentMethod?: PaymentMethod;
  payment?: Payment;
  qrCode?: QrCode;
  createdAt: string;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  urgencyTag?: string;
  minutesRemaining?: number;
}

export interface CartItem {
  food: Food;
  quantity: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  code?: string;
  errors?: any[];
}

export interface DayHistoryItem {
  dateStr: string;
  formattedDate: string;
  dayOfWeek: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number;
  avgOrderValue: number;
}

export interface MonthlyHistoryItem {
  monthKey: string;
  monthLabel: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number;
  avgOrderValue: number;
  days: DayHistoryItem[];
}

