import { MenuRepository } from '../repositories/MenuRepository';
import { MenuSchedule, MealType } from '../types';

export class MenuService {
  private menuRepo: MenuRepository;

  constructor() {
    this.menuRepo = new MenuRepository();
  }

  async getDailyMenus(restaurantId: string, menuDate: string): Promise<MenuSchedule[]> {
    return await this.menuRepo.findSchedulesByDate(restaurantId, menuDate);
  }

  async scheduleMenu(
    restaurantId: string,
    menuDate: string,
    mealType: MealType,
    title: string | undefined,
    foodIds: string[]
  ): Promise<MenuSchedule> {
    return await this.menuRepo.saveSchedule(restaurantId, menuDate, mealType, title, foodIds);
  }

  async deleteSchedule(id: string): Promise<boolean> {
    return await this.menuRepo.deleteSchedule(id);
  }
}
