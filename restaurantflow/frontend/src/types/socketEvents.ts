export const SOCKET_EVENTS = {
  // Connection
  JOIN_RESTAURANT: 'join:restaurant',
  LEAVE_RESTAURANT: 'leave:restaurant',
  JOIN_USER: 'join:user',

  // Real-time Order events
  ORDER_CREATED: 'order:created',
  ORDER_STATUS_UPDATED: 'order:status_updated',
  ORDER_PAYMENT_UPDATED: 'order:payment_updated',
  ORDER_DELIVERED: 'order:delivered',

  // Restaurant events
  RESTAURANT_STATUS_CHANGED: 'restaurant:status_changed',
  RESTAURANT_UPDATED: 'restaurant:updated',
  INVENTORY_UPDATED: 'inventory:updated',
} as const;
