import { InventoryRepository } from '../repositories/InventoryRepository';
import { Inventory } from '../types';
import { emitToRestaurant } from '../websocket/socketServer';
import { SOCKET_EVENTS } from '../websocket/socketEvents';

export class InventoryService {
  private inventoryRepo: InventoryRepository;

  constructor() {
    this.inventoryRepo = new InventoryRepository();
  }

  async getInventory(restaurantId: string): Promise<
    (Inventory & { foodName: string; categoryName?: string; isAvailable: boolean; price: number })[]
  > {
    return await this.inventoryRepo.getAllByRestaurant(restaurantId);
  }

  async updateStock(
    restaurantId: string,
    foodId: string,
    quantity: number,
    lowStockThreshold = 5,
    reason: 'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'SPOILAGE' = 'MANUAL_ADJUSTMENT',
    userId?: string
  ): Promise<Inventory> {
    const updated = await this.inventoryRepo.setStock(
      restaurantId,
      foodId,
      quantity,
      lowStockThreshold,
      reason,
      userId
    );

    // Broadcast inventory update via Socket.IO
    emitToRestaurant(restaurantId, SOCKET_EVENTS.INVENTORY_UPDATED, {
      foodId,
      quantity: updated.quantity,
      isSoldOut: updated.quantity === 0,
    });

    return updated;
  }
}
