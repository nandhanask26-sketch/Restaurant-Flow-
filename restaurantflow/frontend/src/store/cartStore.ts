import { create } from 'zustand';
import { Food, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  addItem: (food: Food, quantity?: number, restaurantName?: string) => void;
  updateQuantity: (foodId: string, quantity: number) => void;
  removeItem: (foodId: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

const getStoredCart = () => {
  try {
    const raw = localStorage.getItem('rf_cart');
    return raw ? JSON.parse(raw) : { items: [], restaurantId: null, restaurantName: null };
  } catch {
    return { items: [], restaurantId: null, restaurantName: null };
  }
};

export const useCartStore = create<CartState>((set, get) => ({
  items: getStoredCart().items || [],
  restaurantId: getStoredCart().restaurantId || null,
  restaurantName: getStoredCart().restaurantName || null,

  addItem: (food, quantity = 1, restaurantName) => {
    const current = get();
    // If cart has items from a different restaurant, reset
    let nextItems = current.restaurantId === food.restaurantId ? [...current.items] : [];
    const restId = food.restaurantId;
    const restName = restaurantName || current.restaurantName;

    const existingIndex = nextItems.findIndex((item) => item.food.id === food.id);
    if (existingIndex > -1) {
      nextItems[existingIndex].quantity += quantity;
    } else {
      nextItems.push({ food, quantity });
    }

    localStorage.setItem(
      'rf_cart',
      JSON.stringify({ items: nextItems, restaurantId: restId, restaurantName: restName })
    );

    set({
      items: nextItems,
      restaurantId: restId,
      restaurantName: restName,
    });
  },

  updateQuantity: (foodId, quantity) => {
    const current = get();
    let nextItems: CartItem[];
    if (quantity <= 0) {
      nextItems = current.items.filter((item) => item.food.id !== foodId);
    } else {
      nextItems = current.items.map((item) =>
        item.food.id === foodId ? { ...item, quantity } : item
      );
    }

    const restId = nextItems.length > 0 ? current.restaurantId : null;
    const restName = nextItems.length > 0 ? current.restaurantName : null;

    localStorage.setItem(
      'rf_cart',
      JSON.stringify({ items: nextItems, restaurantId: restId, restaurantName: restName })
    );

    set({ items: nextItems, restaurantId: restId, restaurantName: restName });
  },

  removeItem: (foodId) => {
    get().updateQuantity(foodId, 0);
  },

  clearCart: () => {
    localStorage.removeItem('rf_cart');
    set({ items: [], restaurantId: null, restaurantName: null });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.food.price * item.quantity, 0);
  },

  getTax: () => {
    return 0; // Zero GST
  },

  getTotal: () => {
    return get().getSubtotal();
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
