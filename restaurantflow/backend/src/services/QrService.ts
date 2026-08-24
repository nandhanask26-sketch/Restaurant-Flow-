import { QrRepository } from '../repositories/QrRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { generateVerificationCode } from '../utils/tokenGenerator';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { QrCode, Order } from '../types';

export class QrService {
  private qrRepo: QrRepository;
  private orderRepo: OrderRepository;

  constructor() {
    this.qrRepo = new QrRepository();
    this.orderRepo = new OrderRepository();
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
   */
  async verifyAndRedeemQr(
    verificationCode: string,
    managerRestaurantId: string,
    managerUserId: string
  ): Promise<{ order: Order; message: string }> {
    // 1. Find QR record
    const qr = await this.qrRepo.findByCode(verificationCode);
    if (!qr) {
      throw new NotFoundError('Invalid verification QR code. Order not found.');
    }

    // 2. Validate restaurant
    if (qr.restaurantId !== managerRestaurantId) {
      throw new BadRequestError('This QR code belongs to a different restaurant.');
    }

    // 3. Check expiration
    if (new Date(qr.expiresAt) < new Date()) {
      throw new BadRequestError('This QR code has expired.');
    }

    // 4. Check if already scanned
    if (qr.isScanned) {
      throw new BadRequestError(
        `This QR code has already been verified and redeemed on ${new Date(
          qr.scannedAt!
        ).toLocaleTimeString()}.`
      );
    }

    // 5. Fetch associated Order
    const order = await this.orderRepo.findById(qr.orderId);
    if (!order) {
      throw new NotFoundError('Order associated with this QR code does not exist.');
    }

    // 6. Check Order status
    if (order.status === 'CANCELLED') {
      throw new BadRequestError('Cannot verify QR code: Order has been cancelled.');
    }
    if (order.status === 'DELIVERED') {
      throw new BadRequestError('Order has already been marked as DELIVERED.');
    }

    // 7. Check Payment Status
    if (order.payment?.status !== 'PAID' && order.payment?.paymentMethod !== 'CASH_ON_DELIVERY') {
      throw new BadRequestError('Order payment is still pending. Cannot verify delivery.');
    }

    // 8. Mark QR as scanned
    await this.qrRepo.markScanned(verificationCode, managerUserId);

    return {
      order,
      message: `QR verification successful for Order ${order.orderToken}. Ready for delivery.`,
    };
  }
}
