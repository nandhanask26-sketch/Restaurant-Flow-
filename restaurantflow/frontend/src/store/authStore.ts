import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  restaurantId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, restaurantId?: string) => void;
  updateUser: (updatedData: Partial<User>) => void;
  logout: () => void;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('rf_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  restaurantId: localStorage.getItem('rf_restaurant_id'),
  accessToken: localStorage.getItem('rf_access_token'),
  refreshToken: localStorage.getItem('rf_refresh_token'),
  isAuthenticated: Boolean(getStoredUser() && localStorage.getItem('rf_access_token')),

  setAuth: (user, accessToken, refreshToken, restaurantId) => {
    localStorage.setItem('rf_user', JSON.stringify(user));
    localStorage.setItem('rf_access_token', accessToken);
    localStorage.setItem('rf_refresh_token', refreshToken);
    if (restaurantId) {
      localStorage.setItem('rf_restaurant_id', restaurantId);
    } else {
      localStorage.removeItem('rf_restaurant_id');
    }

    set({
      user,
      accessToken,
      refreshToken,
      restaurantId: restaurantId || null,
      isAuthenticated: true,
    });
  },

  updateUser: (updatedData: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const nextUser = { ...current, ...updatedData };
    localStorage.setItem('rf_user', JSON.stringify(nextUser));
    set({ user: nextUser });
  },

  logout: () => {
    localStorage.removeItem('rf_user');
    localStorage.removeItem('rf_access_token');
    localStorage.removeItem('rf_refresh_token');
    localStorage.removeItem('rf_restaurant_id');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      restaurantId: null,
      isAuthenticated: false,
    });
  },
}));
