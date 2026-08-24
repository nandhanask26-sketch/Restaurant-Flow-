import { AnalyticsRepository } from '../repositories/AnalyticsRepository';

export class AnalyticsService {
  private analyticsRepo: AnalyticsRepository;

  constructor() {
    this.analyticsRepo = new AnalyticsRepository();
  }

  async getRestaurantAnalytics(restaurantId: string) {
    const [kpis, monthlyHistory, dailyRevenue, hourlyOrders, topFoods, paymentDistribution] = await Promise.all([
      this.analyticsRepo.getDashboardKPIs(restaurantId),
      this.analyticsRepo.getMonthlyOrderHistory(restaurantId),
      this.analyticsRepo.getRevenueByDay(restaurantId, 7),
      this.analyticsRepo.getHourlyDistribution(restaurantId),
      this.analyticsRepo.getTopFoods(restaurantId, 6),
      this.analyticsRepo.getPaymentDistribution(restaurantId),
    ]);

    return {
      kpis,
      monthlyHistory,
      charts: {
        dailyRevenue,
        hourlyOrders,
        topFoods,
        paymentDistribution,
      },
    };
  }
}
