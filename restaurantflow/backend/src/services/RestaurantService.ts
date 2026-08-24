import { RestaurantRepository } from '../repositories/RestaurantRepository';
import { Restaurant } from '../types';
import { NotFoundError } from '../utils/errors';
import { emitToRestaurant, emitGlobal } from '../websocket/socketServer';
import { SOCKET_EVENTS } from '../websocket/socketEvents';

export class RestaurantService {
  private restaurantRepo: RestaurantRepository;

  constructor() {
    this.restaurantRepo = new RestaurantRepository();
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return await this.restaurantRepo.findAll();
  }

  async getRestaurantById(id: string): Promise<Restaurant> {
    const rest = await this.restaurantRepo.findById(id);
    if (!rest) {
      throw new NotFoundError('Restaurant not found');
    }
    return rest;
  }

  async getRestaurantStatus(id: string): Promise<{ id: string; name: string; isOpen: boolean }> {
    const rest = await this.getRestaurantById(id);
    return { id: rest.id, name: rest.name, isOpen: rest.isOpen };
  }

  async setRestaurantStatus(id: string, isOpen: boolean): Promise<Restaurant> {
    const updated = await this.restaurantRepo.updateStatus(id, isOpen);
    if (!updated) {
      throw new NotFoundError('Restaurant not found');
    }

    // Broadcast live status shift instantly through Socket.IO
    emitToRestaurant(id, SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, {
      restaurantId: id,
      isOpen: updated.isOpen,
    });
    emitGlobal(SOCKET_EVENTS.RESTAURANT_STATUS_CHANGED, {
      restaurantId: id,
      isOpen: updated.isOpen,
    });

    return updated;
  }
}
