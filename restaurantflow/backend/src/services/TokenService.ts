import { PoolClient } from 'pg';
import { TokenRepository } from '../repositories/TokenRepository';

export class TokenService {
  private tokenRepo: TokenRepository;

  constructor() {
    this.tokenRepo = new TokenRepository();
  }

  async generateDailyOrderToken(
    restaurantId: string,
    orderId: string,
    client: PoolClient
  ): Promise<string> {
    const result = await this.tokenRepo.generateDailyToken(restaurantId, orderId, client);
    return result.tokenString;
  }
}
