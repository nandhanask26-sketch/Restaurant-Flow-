import { AuditRepository } from '../repositories/AuditRepository';
import { AuditLog } from '../types';

export class AuditService {
  private auditRepo: AuditRepository;

  constructor() {
    this.auditRepo = new AuditRepository();
  }

  async record(
    action: string,
    entityType: string,
    options?: {
      userId?: string;
      restaurantId?: string;
      entityId?: string;
      metadata?: Record<string, any>;
      ipAddress?: string;
    }
  ): Promise<AuditLog> {
    return await this.auditRepo.log({
      action,
      entityType,
      userId: options?.userId,
      restaurantId: options?.restaurantId,
      entityId: options?.entityId,
      metadata: options?.metadata,
      ipAddress: options?.ipAddress,
    });
  }

  async getLogs(restaurantId: string, limit = 50): Promise<AuditLog[]> {
    return await this.auditRepo.findByRestaurant(restaurantId, limit);
  }
}
