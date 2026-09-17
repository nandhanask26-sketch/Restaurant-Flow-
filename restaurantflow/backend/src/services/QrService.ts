import { QrRepository } from '../repositories/QrRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { TokenRepository } from '../repositories/TokenRepository';
import { generateVerificationCode, getPassOtp } from '../utils/tokenGenerator';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { QrCode, Order } from '../types';
import { emitToRestaurant, emitToUser } from '../websocket/socketServer';
import { SOCKET_EVENTS } from '../websocket/socketEvents';

export class QrService {
  private qrRepo: QrRepository;
  private orderRepo: OrderRepository;
  private paymentRepo: PaymentRepository;
  private tokenRepo: TokenRepository;

  constructor() {
    this.qrRepo = new QrRepository();
    this.orderRepo = new OrderRepository();
    this.paymentRepo = new PaymentRepository();
    this.tokenRepo = new TokenRepository();
  }

  async generateOrderQr(orderId: string, restaurantId: string): Promise<QrCode> {
    const code = generateVerificationCode(orderId);
    return await this.qrRepo.create(orderId, restaurantId, code);
  }

  async getQrForOrder(orderId: string): Promise<QrCode | null> {
    return await this.qrRepo.findByOrderId(orderId);
  }

  /**
   * Manager Scans and Verifies Customer's Order QR Code / Pass OTP / Token
   * Returns complete order details with food items, token time, and date.
   */
  async verifyAndRedeemQr(
    rawCode: string,
    managerRestaurantId: string,
    managerUserId: string
  ): Promise<{ order: Order; message: string; alreadyRedeemed?: boolean }> {
    const verificationCode = rawCode.trim();
    const cleanToken = verificationCode.replace(/^#/, '').trim();

    // 1. Find QR record by verification code
    let qr = await this.qrRepo.findByCode(verificationCode);
    let order: Order | null = null;

    if (!qr) {
      // 1b. Try matching order token directly (e.g. 1709001, #1709001, or RF-20260917-001)
      order = await this.orderRepo.findByToken(cleanToken);
      if (!order && cleanToken !== verificationCode) {
        order = await this.orderRepo.findByToken(verificationCode);
      }

      if (!order) {
        // 1c. Try sequence lookup (e.g. "001" or "1")
        const tokenLookup = await this.tokenRepo.findByToken(cleanToken);
        if (tokenLookup) {
          order = await this.orderRepo.findById(tokenLookup.orderId);
        }
      }

      // 1d. Try matching partial code
      if (!order && !qr) {
        qr = await this.qrRepo.findByPartialCodeOrOtp(cleanToken, managerRestaurantId);
      }

      // 1e. If 6-digit numeric OTP provided, scan recent QRs for this restaurant
      if (!order && !qr && /^\d{4,6}$/.test(cleanToken)) {
        const recentQrs = await this.qrRepo.findRecentForRestaurant(managerRestaurantId, 100);
        for (const candidate of recentQrs) {
          const candidateOtp = getPassOtp(candidate.verificationCode, candidate.orderId);
          if (candidateOtp === cleanToken) {
            qr = candidate;
            break;
          }
        }
      }

      if (order && !qr) {
        qr = await this.qrRepo.findByOrderId(order.id);
        if (!qr) {
          qr = await this.qrRepo.create(order.id, order.restaurantId, generateVerificationCode(order.id));
        }
      }
    }

    if (!qr && !order) {
      throw new NotFoundError('Invalid QR code, Pass OTP, or Token Number. No matching order found.');
    }

    // 2. Validate restaurant ownership
    const targetRestaurantId = qr ? qr.restaurantId : order?.restaurantId;
    if (targetRestaurantId !== managerRestaurantId) {
      throw new BadRequestError('This QR code or token belongs to a different cafeteria / restaurant.');
    }

    // 3. Fetch associated Order
    if (!order && qr) {
      order = await this.orderRepo.findById(qr.orderId);
    }
    if (!order) {
      throw new NotFoundError('Order associated with this QR code does not exist.');
    }

    // Attach qr code record so frontend has verificationCode
    if (qr) {
      order.qrCode = qr;
    }

    // 4. CRITICAL ANTI-DUPLICATE CHECK: If already delivered, inform manager with food items rather than blank error
    if (qr?.isScanned || order.status === 'DELIVERED') {
      const scannedDate = qr?.scannedAt ? new Date(qr.scannedAt) : new Date();
      const timeStr = scannedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = scannedDate.toLocaleDateString();
      return {
        order,
        alreadyRedeemed: true,
        message: `⛔ ALREADY REDEEMED! Token #${order.orderToken} was verified on ${dateStr} at ${timeStr}. Food already claimed!`,
      };
    }

    // 5. Check if cancelled or payment failed
    if (order.status === 'CANCELLED') {
      throw new BadRequestError(`Cannot verify QR code: Order #${order.orderToken} has been cancelled.`);
    }
    if (order.status === 'PAYMENT_FAILED' || (order.payment?.paymentMethod === 'UPI' && order.payment?.status !== 'PAID')) {
      throw new BadRequestError(`⛔ REJECTED / UNPAID UPI ORDER! Token #${order.orderToken} was rejected or not paid. Food cannot be supplied!`);
    }

    // 6. Check Expiration
    if (qr && new Date(qr.expiresAt) < new Date()) {
      throw new BadRequestError('This QR code has expired.');
    }

    // 7. Mark QR as scanned in DB
    if (qr) {
      await this.qrRepo.markScanned(qr.verificationCode, managerUserId);
    }

    // 8. Automatically mark Order as DELIVERED in DB
    const updated = await this.orderRepo.updateStatus(order.id, 'DELIVERED');
    const deliveredOrder = updated || order;
    deliveredOrder.status = 'DELIVERED';
    deliveredOrder.deliveredAt = new Date();
    if (qr) {
      deliveredOrder.qrCode = qr;
    }

    // 9. For Cash on Delivery orders, keep status UNPAID so manager is alerted to collect cash at counter
    const isCod = deliveredOrder.payment?.paymentMethod === 'CASH_ON_DELIVERY' || deliveredOrder.payment?.status === 'UNPAID';
    if (isCod && deliveredOrder.payment) {
      deliveredOrder.payment.status = 'UNPAID';
    }

    // 10. Broadcast Real-time Socket.IO Events
    emitToRestaurant(managerRestaurantId, SOCKET_EVENTS.ORDER_STATUS_UPDATED, deliveredOrder);
    emitToUser(deliveredOrder.userId, SOCKET_EVENTS.ORDER_STATUS_UPDATED, deliveredOrder);
    emitToRestaurant(managerRestaurantId, SOCKET_EVENTS.ORDER_DELIVERED, deliveredOrder);
    emitToUser(deliveredOrder.userId, SOCKET_EVENTS.ORDER_DELIVERED, deliveredOrder);

    return {
      order: deliveredOrder,
      alreadyRedeemed: false,
      message: isCod
        ? `⚠️ Order #${deliveredOrder.orderToken} verified! CASH ON DELIVERY — Collect ₹${deliveredOrder.totalAmount.toFixed(0)} cash from customer.`
        : `✅ Order #${deliveredOrder.orderToken} verified & PAID via UPI! Supply food items to customer.`,
    };
  }
}

