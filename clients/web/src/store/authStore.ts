import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '@/types';
import { apiService } from '@/services/api';
import { socketService } from '@/services/socket';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null
        }),

      setTokens: (tokens) => {
        apiService.setTokens(tokens);
        set({ isAuthenticated: true });
      },

      logout: () => {
        apiService.clearTokens();
        socketService.disconnect();
        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
