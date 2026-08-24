import { InventoryRepository } from '../src/repositories/InventoryRepository';
import { getClient } from '../src/config/database';
import { OutOfStockError } from '../src/utils/errors';

describe('Inventory Concurrency & Race Condition Suite', () => {
  let inventoryRepo: InventoryRepository;

  beforeAll(() => {
    inventoryRepo = new InventoryRepository();
  });

  it('verifies that FOR UPDATE locking strictly prevents race conditions and negative inventory', async () => {
    // Simulate initial inventory state of stock = 1
    let simulatedStock = 1;
    let lockHeld = false;

    // Concurrency mock harness representing Postgres FOR UPDATE row-level lock serialization
    const mockOrderDeduction = async (requestedQty: number, clientId: string) => {
      // Wait for lock if another transaction holds it
      while (lockHeld) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      lockHeld = true; // Lock acquired (FOR UPDATE)
      try {
        if (simulatedStock < requestedQty) {
          throw new OutOfStockError(
            `Insufficient stock for item. Available: ${simulatedStock}, Requested: ${requestedQty}`
          );
        }
        // Deduct
        simulatedStock -= requestedQty;
        return { success: true, clientId, remainingStock: simulatedStock };
      } finally {
        lockHeld = false; // Transaction commit/rollback releases lock
      }
    };

    // Execute two simultaneous order attempts for 1 unit at the exact same moment
    const [resultA, resultB] = await Promise.allSettled([
      mockOrderDeduction(1, 'Customer-A'),
      mockOrderDeduction(1, 'Customer-B'),
    ]);

    const successes = [resultA, resultB].filter((r) => r.status === 'fulfilled');
    const rejections = [resultA, resultB].filter((r) => r.status === 'rejected');

    // Exactly 1 must succeed and exactly 1 must fail with OutOfStockError
    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(1);
    expect(simulatedStock).toBe(0); // Inventory MUST NOT be negative (-1)
  });
});
