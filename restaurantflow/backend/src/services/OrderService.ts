import { getClient } from '../config/database';
import { OrderRepository } from '../repositories/OrderRepository';
import { RestaurantRepository } from '../repositories/RestaurantRepository';
import { FoodRepository } from '../repositories/FoodRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { TokenService } from './TokenService';
import { PaymentService } from './payment/PaymentService';
import { QrService } from './QrService';
import { Order, OrderStatus, PaymentMethod, PreferredTimeType } from '../types';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { emitToRestaurant, emitToUser } from '../websocket/socketServer';
import { SOCKET_EVENTS } from '../websocket/socketEvents';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED'],
  PAYMENT_PENDING: ['CONFIRMED', 'PAYMENT_FAILED', 'CANCELLED'],
  CONFIRMED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  PAYMENT_FAILED: [],
};

export class OrderService {
  private orderRepo: OrderRepository;
  private restaurantRepo: RestaurantRepository;
  private foodRepo: FoodRepository;
  private inventoryRepo: InventoryRepository;
  private tokenService: TokenService;
  private paymentService: PaymentService;
  private qrService: QrService;

  constructor() {
    this.orderRepo = new OrderRepository();
    this.restaurantRepo = new RestaurantRepository();
    this.foodRepo = new FoodRepository();
    this.inventoryRepo = new InventoryRepository();
    this.tokenService = new TokenService();
    this.paymentService = new PaymentService();
    this.qrService = new QrService();
  }

  async createOrder(
    userId: string,
    customerDetails: { name: string; email?: string; phone?: string },
    data: {
      restaurantId: string;
      preferredTimeType: PreferredTimeType;
      requestedFoodAt: string | Date;
      paymentMethod: PaymentMethod;
      transactionId?: string;
      notes?: string;
      items: { foodId: string; quantity: number }[];
    }
  ): Promise<Order> {
    if (data.paymentMethod === 'UPI') {
      if (!data.transactionId || data.transactionId.trim().length < 4) {
        throw new BadRequestError('Please complete payment via your UPI app and enter the 12-digit UPI Reference / UTR Number from your payment receipt.');
      }
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 1. Validate Restaurant status
      let restaurant = await this.restaurantRepo.findById(data.restaurantId, client);
      if (!restaurant) {
        const allRestaurants = await this.restaurantRepo.findAll();
        if (allRestaurants.length > 0) {
          restaurant = allRestaurants[0];
          data.restaurantId = restaurant.id;
        } else {
          throw new NotFoundError('Restaurant not found');
        }
      }
      if (!restaurant.isOpen) {
        throw new BadRequestError('Restaurant is currently closed. New orders cannot be placed at this time.');
      }

      // 2. Validate requested food time
      const requestedDate = new Date(data.requestedFoodAt);
      if (isNaN(requestedDate.getTime())) {
        throw new BadRequestError('Invalid requested food time');
      }

      // 3. Fetch foods, validate availability, and calculate authoritative backend totals
      let subtotal = 0;
      const orderItemsSnapshot: {
        foodId: string;
        foodName: string;
        unitPrice: number;
        quantity: number;
        totalPrice: number;
      }[] = [];

      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new BadRequestError(`Quantity for food item must be at least 1`);
        }

        const food = await this.foodRepo.findById(item.foodId, client);
        if (!food || food.restaurantId !== data.restaurantId) {
          throw new NotFoundError(`Food item ${item.foodId} not found in this restaurant`);
        }
        if (!food.isAvailable) {
          throw new BadRequestError(`Food item "${food.name}" is currently marked unavailable`);
        }

        // Concurrency Critical: Lock inventory row with FOR UPDATE and deduct
        await this.inventoryRepo.lockAndDeductStock(food.id, item.quantity, 'temp-order', client);

        const lineTotal = food.price * item.quantity;
        subtotal += lineTotal;

        orderItemsSnapshot.push({
          foodId: food.id,
          foodName: food.name,
          unitPrice: food.price,
          quantity: item.quantity,
          totalPrice: lineTotal,
        });
      }

      // Zero GST (tax-free net pricing)
      const tax = 0;
      const totalAmount = subtotal;

      // 4. Temporary placeholder token to create order row
      const tempToken = `RF-TEMP-${Date.now()}`;
      const initialStatus: OrderStatus = data.paymentMethod === 'CASH_ON_DELIVERY' ? 'CONFIRMED' : 'CONFIRMED';

      const order = await this.orderRepo.create(
        {
          restaurantId: data.restaurantId,
          userId,
          orderToken: tempToken,
          status: initialStatus,
          preferredTimeType: data.preferredTimeType,
          requestedFoodAt: requestedDate,
          subtotal,
          tax,
          totalAmount,
          notes: data.notes,
        },
        orderItemsSnapshot,
        client
      );

      // 5. Generate Authoritative Sequential Daily Token (e.g. RF-20260821-001)
      const authoritativeToken = await this.tokenService.generateDailyOrderToken(
        data.restaurantId,
        order.id,
        client
      );

      // Update order with the authoritative token
      await client.query(`UPDATE orders SET order_token = $1 WHERE id = $2`, [
        authoritativeToken,
        order.id,
      ]);
      order.orderToken = authoritativeToken;

      await client.query('COMMIT');

      // 6. Process Payment
      const payment = await this.paymentService.processOrderPayment(
        order.id,
        data.restaurantId,
        userId,
        totalAmount,
        data.paymentMethod,
        {
          name: customerDetails.name,
          email: customerDetails.email || '',
          phone: customerDetails.phone || '',
        },
        data.transactionId
      );
      order.payment = payment;

      // 7. Ensure QR Code is generated & attached for the customer (Online Paid and COD)
      let qr = await this.qrService.getQrForOrder(order.id);
      if (!qr) {
        qr = await this.qrService.generateOrderQr(order.id, data.restaurantId);
      }
      order.qrCode = qr;

      // 8. Real-time Notification via Socket.IO
      emitToRestaurant(data.restaurantId, SOCKET_EVENTS.ORDER_CREATED, order);
      emitToUser(userId, SOCKET_EVENTS.ORDER_CREATED, order);

      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    extra?: { cancellationReason?: string; notes?: string; managerUserId?: string }
  ): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Validate State Transition
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition: Cannot change order status from "${order.status}" to "${newStatus}".`
      );
    }

    // If order is cancelled, replenish inventory
    if (newStatus === 'CANCELLED' && order.items) {
      for (const item of order.items) {
        await this.inventoryRepo.replenishStock(
          item.foodId,
          item.quantity,
          'ORDER_CANCELLED',
          order.id,
          extra?.managerUserId
        );
      }
    }

    const updated = await this.orderRepo.updateStatus(orderId, newStatus, extra);

    // Broadcast update
    emitToRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_STATUS_UPDATED, updated);
    emitToUser(order.userId, SOCKET_EVENTS.ORDER_STATUS_UPDATED, updated);

    return updated!;
  }

  async getOrderById(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    const qr = await this.qrService.getQrForOrder(order.id);
    if (qr) order.qrCode = qr;
    return order;
  }

  async getSmartQueueOrders(restaurantId: string): Promise<(Order & { urgencyTag: string; minutesRemaining: number })[]> {
    const orders = await this.orderRepo.getSmartQueue(restaurantId);
    const now = Date.now();

    return orders.map((order) => {
      const requestedTime = new Date(order.requestedFoodAt).getTime();
      const minutesRemaining = Math.round((requestedTime - now) / 60000);

      let urgencyTag = 'IN QUEUE';
      if (minutesRemaining < 0) {
        urgencyTag = 'OVERDUE';
      } else if (minutesRemaining <= 5) {
        urgencyTag = 'READY IN 5 MIN';
      } else if (minutesRemaining <= 15) {
        urgencyTag = `READY IN ${minutesRemaining} MIN`;
      } else {
        urgencyTag = `SCHEDULED (${minutesRemaining}m)`;
      }

      return {
        ...order,
        urgencyTag,
        minutesRemaining,
      };
    });
  }

  async deleteOrder(orderId: string, restaurantId?: string): Promise<boolean> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    if (restaurantId && order.restaurantId !== restaurantId) {
      throw new BadRequestError('Cannot delete order belonging to another restaurant');
    }

    const deleted = await this.orderRepo.deleteOrder(orderId, restaurantId);
    if (deleted) {
      emitToRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
        id: orderId,
        status: 'DELETED',
      });
    }
    return deleted;
  }

  async deleteBulkOrders(orderIds: string[], restaurantId?: string): Promise<number> {
    const count = await this.orderRepo.deleteBulkOrders(orderIds, restaurantId);
    if (restaurantId && count > 0) {
      emitToRestaurant(restaurantId, SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
        bulkDeleted: true,
        count,
      });
    }
    return count;
  }

  async clearOrderHistory(
    restaurantId: string,
    options?: { date?: string; status?: string }
  ): Promise<number> {
    const count = await this.orderRepo.clearHistory(restaurantId, options);
    if (count > 0) {
      emitToRestaurant(restaurantId, SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
        historyCleared: true,
        count,
      });
    }
    return count;
  }
}
