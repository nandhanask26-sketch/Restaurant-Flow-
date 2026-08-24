import { FoodRepository } from '../repositories/FoodRepository';
import { Food, Category } from '../types';
import { NotFoundError } from '../utils/errors';

export class FoodService {
  private foodRepo: FoodRepository;

  constructor() {
    this.foodRepo = new FoodRepository();
  }

  async getFoodsByRestaurant(
    restaurantId: string,
    options?: { categoryId?: string; onlyAvailable?: boolean; search?: string }
  ): Promise<Food[]> {
    return await this.foodRepo.findAllByRestaurant(restaurantId, options);
  }

  async getFoodById(id: string): Promise<Food> {
    const food = await this.foodRepo.findById(id);
    if (!food) {
      throw new NotFoundError('Food item not found');
    }
    return food;
  }

  async createFood(
    restaurantId: string,
    data: {
      name: string;
      description?: string;
      categoryId?: string | null;
      price: number;
      imageUrl?: string | null;
      preparationTimeMinutes: number;
      isAvailable?: boolean;
      isVegetarian?: boolean;
      initialStock?: number;
    }
  ): Promise<Food> {
    return await this.foodRepo.create({
      ...data,
      restaurantId,
    });
  }

  async updateFood(id: string, data: Partial<Food>): Promise<Food> {
    const updated = await this.foodRepo.update(id, data);
    if (!updated) {
      throw new NotFoundError('Food item not found');
    }
    return updated;
  }

  async deleteFood(id: string): Promise<boolean> {
    const deleted = await this.foodRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError('Food item not found');
    }
    return true;
  }

  async getCategories(restaurantId: string): Promise<Category[]> {
    return await this.foodRepo.getCategories(restaurantId);
  }

  async createCategory(restaurantId: string, name: string): Promise<Category> {
    return await this.foodRepo.createCategory(restaurantId, name);
  }
}
