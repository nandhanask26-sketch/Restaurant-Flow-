import { QrRepository } from '../repositories/QrRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { TokenRepository } from '../repositories/TokenRepository';
import { generateVerificationCode } from '../utils/tokenGenerator';
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
   * Manager Scans and Verifies Customer's Order QR Code
   * Automatically marks QR as USED, order as DELIVERED, and strictly prevents duplicate claiming!
   */
  async verifyAndRedeemQr(
    rawCode: string,
    managerRestaurantId: string,
    managerUserId: string
  ): Promise<{ order: Order; message: string }> {
    const verificationCode = rawCode.trim();

    // 1. Find QR record by verification code OR by orderToken / sequence number
    let qr = await this.qrRepo.findByCode(verificationCode);
    let order: Order | null = null;

    if (!qr) {
      // Check if input matches order token (e.g. TK-0909-001 or RF-20260909-001)
      order = await this.orderRepo.findByToken(verificationCode);
      if (!order) {
        // Try looking up via TokenRepository (supports sequence search like "001" or "1")
        const tokenLookup = await this.tokenRepo.findByToken(verificationCode);
        if (tokenLookup) {
          order = await this.orderRepo.findById(tokenLookup.orderId);
        }
      }

      if (order) {
        qr = await this.qrRepo.findByOrderId(order.id);
        if (!qr) {
          qr = await this.qrRepo.create(order.id, order.restaurantId, generateVerificationCode(order.id));
        }
      }
    }

    if (!qr) {
      throw new NotFoundError('Invalid verification code or QR code. No matching order found.');
    }

    // 2. Validate restaurant ownership
    if (qr.restaurantId !== managerRestaurantId) {
      throw new BadRequestError('This QR code belongs to a different restaurant / cafeteria.');
    }

    // 3. Fetch associated Order
    if (!order) {
      order = await this.orderRepo.findById(qr.orderId);
    }
    if (!order) {
      throw new NotFoundError('Order associated with this QR code does not exist.');
    }

    // 4. CRITICAL ANTI-DUPLICATE CHECK: Single-use enforcement!
    if (qr.isScanned || order.status === 'DELIVERED') {
      const scannedDate = qr.scannedAt ? new Date(qr.scannedAt) : new Date();
      const timeStr = scannedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = scannedDate.toLocaleDateString();
      throw new BadRequestError(
        `⛔ QR CODE ALREADY REDEEMED / USED! Token #${order.orderToken} was already scanned and food supplied on ${dateStr} at ${timeStr}. Duplicate food claiming is strictly blocked!`
      );
    }

    // 5. Check if cancelled or payment failed
    if (order.status === 'CANCELLED') {
      throw new BadRequestError(`Cannot verify QR code: Order #${order.orderToken} has been cancelled.`);
    }
    if (order.status === 'PAYMENT_FAILED' || (order.payment?.paymentMethod === 'UPI' && order.payment?.status !== 'PAID')) {
      throw new BadRequestError(`⛔ REJECTED / UNPAID UPI ORDER! Token #${order.orderToken} was rejected or not paid. Food cannot be supplied!`);
    }

    // 6. Check Expiration
    if (new Date(qr.expiresAt) < new Date()) {
      throw new BadRequestError('This QR code has expired.');
    }

    // 7. Mark QR as scanned in DB
    await this.qrRepo.markScanned(qr.verificationCode, managerUserId);

    // 8. Automatically mark Order as DELIVERED in DB
    const updated = await this.orderRepo.updateStatus(order.id, 'DELIVERED');
    const deliveredOrder = updated || order;
    deliveredOrder.status = 'DELIVERED';
    deliveredOrder.deliveredAt = new Date();

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
      message: isCod
        ? `⚠️ Order #${deliveredOrder.orderToken} verified! CASH ON DELIVERY — Collect ₹${deliveredOrder.totalAmount.toFixed(0)} cash from customer.`
        : `✅ Order #${deliveredOrder.orderToken} verified & PAID via UPI! Supply food items to customer.`,
    };
  }
}
