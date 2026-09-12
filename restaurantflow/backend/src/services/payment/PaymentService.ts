import { PaymentProvider } from './PaymentProvider';
import { MockPaymentProvider } from './MockPaymentProvider';
import { PaymentRepository } from '../../repositories/PaymentRepository';
import { OrderRepository } from '../../repositories/OrderRepository';
import { QrService } from '../QrService';
import { env } from '../../config/env';
import { PaymentMethod, Payment } from '../../types';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { emitToRestaurant, emitToUser } from '../../websocket/socketServer';
import { SOCKET_EVENTS } from '../../websocket/socketEvents';

export class PaymentService {
  private provider: PaymentProvider;
  private paymentRepo: PaymentRepository;
  private orderRepo: OrderRepository;
  private qrService: QrService;

  constructor() {
    this.provider = env.PAYMENT_PROVIDER === 'mock' ? new MockPaymentProvider() : new MockPaymentProvider();
    this.paymentRepo = new PaymentRepository();
    this.orderRepo = new OrderRepository();
    this.qrService = new QrService();
  }

  async processOrderPayment(
    orderId: string,
    restaurantId: string,
    userId: string,
    amount: number,
    method: PaymentMethod,
    customerDetails: { name: string; email: string; phone: string },
    customTransactionId?: string
  ): Promise<Payment> {
    const isUpiPaid = method === 'UPI';
    const finalStatus = isUpiPaid ? 'PAID' : (method === 'CASH_ON_DELIVERY' ? 'UNPAID' : 'PENDING');
    const finalTransactionId = customTransactionId && customTransactionId.trim().length >= 4
      ? customTransactionId.trim()
      : (isUpiPaid ? `UPI_GATEWAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}` : `COD-${Date.now()}`);

    // 1. Request intent from provider
    const intent = await this.provider.createPaymentIntent(orderId, amount, method, customerDetails);

    // 2. Save payment record
    const payment = await this.paymentRepo.create({
      orderId,
      restaurantId,
      userId,
      amount,
      paymentMethod: method,
      paymentProvider: env.PAYMENT_PROVIDER,
      status: finalStatus,
      transactionId: finalTransactionId,
      providerResponse: {
        ...intent.providerMetadata,
        method,
        gatewayTransactionId: finalTransactionId,
        verifiedAt: isUpiPaid ? new Date().toISOString() : undefined,
      },
    });

    // 3. Auto-generate QR code for customer pass
    await this.qrService.generateOrderQr(orderId, restaurantId);

    if (finalStatus === 'PAID') {
      emitToRestaurant(restaurantId, SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
        orderId,
        status: 'PAID',
        paymentMethod: method,
        transactionId: finalTransactionId,
      });
      emitToUser(userId, SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
        orderId,
        status: 'PAID',
      });
    }

    return payment;
  }

  async verifyPayment(orderId: string, transactionId: string): Promise<Payment> {
    const existing = await this.paymentRepo.findByOrderId(orderId);
    if (!existing) {
      throw new NotFoundError('Payment record not found');
    }

    const verification = await this.provider.verifyPayment(transactionId);
    if (!verification.isVerified) {
      throw new BadRequestError('Payment verification failed');
    }

    const updated = await this.paymentRepo.updateStatus(orderId, 'PAID', transactionId, verification);
    
    // Generate secure QR for verified order if not already generated
    const existingQr = await this.qrService.getQrForOrder(orderId);
    if (!existingQr) {
      await this.qrService.generateOrderQr(orderId, existing.restaurantId);
    }

    // Update order status to CONFIRMED if it was PAYMENT_PENDING
    await this.orderRepo.updateStatus(orderId, 'CONFIRMED');

    emitToRestaurant(existing.restaurantId, SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
      orderId,
      status: 'PAID',
    });
    emitToUser(existing.userId, SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
      orderId,
      status: 'PAID',
    });

    return updated!;
  }

  async markCashReceived(orderId: string, managerUserId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError('Payment not found for order');
    }

    if (payment.paymentMethod !== 'CASH_ON_DELIVERY') {
      throw new BadRequestError('Only Cash on Delivery orders can be manually marked as paid');
    }

    const updated = await this.paymentRepo.updateStatus(orderId, 'PAID', `CASH_COLLECTED_BY_${managerUserId}`, {
      collectedBy: managerUserId,
      timestamp: new Date().toISOString(),
    });

    emitToRestaurant(payment.restaurantId, SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
      orderId,
      status: 'PAID',
    });
    emitToUser(payment.userId, SOCKET_EVENTS.ORDER_PAYMENT_UPDATED, {
      orderId,
      status: 'PAID',
    });

    return updated!;
  }
}
