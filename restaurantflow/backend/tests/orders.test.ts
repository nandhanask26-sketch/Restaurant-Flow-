/// <reference types="jest" />
import { OrderStatus } from '../src/types';

describe('Order State Machine & Transition Rules', () => {
  const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    CREATED: ['PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED'],
    PAYMENT_PENDING: ['CONFIRMED', 'PAYMENT_FAILED', 'CANCELLED'],
    CONFIRMED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
    PAYMENT_FAILED: [],
  };

  function isValidTransition(current: OrderStatus, next: OrderStatus): boolean {
    return (VALID_TRANSITIONS[current] || []).includes(next);
  }

  it('should allow valid sequential progression of order lifecycle', () => {
    expect(isValidTransition('CONFIRMED', 'DELIVERED')).toBe(true);
  });

  it('should strictly reject invalid backwards or illegal transitions', () => {
    // Cannot move from DELIVERED back to CONFIRMED
    expect(isValidTransition('DELIVERED', 'CONFIRMED')).toBe(false);
    // Cannot move from DELIVERED to CANCELLED
    expect(isValidTransition('DELIVERED', 'CANCELLED')).toBe(false);
    // Cannot jump from CREATED directly to DELIVERED
    expect(isValidTransition('CREATED', 'DELIVERED')).toBe(false);
    // Cannot move from CANCELLED to DELIVERED
    expect(isValidTransition('CANCELLED', 'DELIVERED')).toBe(false);
  });
});
