import {create} from 'zustand';
import {User, AuthTokens} from '@/types';
import {STORAGE_KEYS} from '@/constants/config';
import storageUtils from '@/utils/storage';
import api from '@/services/api';
import socketService from '@/services/socket';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  login: (phoneNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    phoneNumber: string;
    displayName: string;
    password: string;
  }) => Promise<void>;
  verifyOtp: (phoneNumber: string, code: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  enableBiometric: () => void;
  disableBiometric: () => void;
  loadPersistedAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  biometricEnabled: false,

  setUser: (user) => {
    set({user, isAuthenticated: !!user});
    if (user) {
      storageUtils.set(STORAGE_KEYS.USER, user);
    } else {
      storageUtils.remove(STORAGE_KEYS.USER);
    }
  },

  setTokens: (tokens) => {
    set({tokens});
    if (tokens) {
      storageUtils.set(STORAGE_KEYS.AUTH_TOKENS, tokens);
      api.setAuthToken(tokens.accessToken);
      socketService.connect();
    } else {
      storageUtils.remove(STORAGE_KEYS.AUTH_TOKENS);
      api.clearAuthToken();
      socketService.disconnect();
    }
  },

  login: async (phoneNumber, password) => {
    set({isLoading: true});
    try {
      const response = await api.post<{user: User; tokens: AuthTokens}>(
        '/auth/login',
        {phoneNumber, password},
      );

      get().setUser(response.user);
      get().setTokens(response.tokens);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      get().setUser(null);
      get().setTokens(null);
      storageUtils.clear();
    }
  },

  register: async (data) => {
    set({isLoading: true});
    try {
      await api.post('/auth/register', data);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  verifyOtp: async (phoneNumber, code) => {
    set({isLoading: true});
    try {
      const response = await api.post<{user: User; tokens: AuthTokens}>(
        '/auth/verify-otp',
        {phoneNumber, code},
      );

      get().setUser(response.user);
      get().setTokens(response.tokens);
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  updateProfile: async (data) => {
    set({isLoading: true});
    try {
      const updatedUser = await api.patch<User>('/users/me', data);
      get().setUser(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  enableBiometric: () => {
    set({biometricEnabled: true});
    storageUtils.setBoolean(STORAGE_KEYS.BIOMETRIC_ENABLED, true);
  },

  disableBiometric: () => {
    set({biometricEnabled: false});
    storageUtils.setBoolean(STORAGE_KEYS.BIOMETRIC_ENABLED, false);
  },

  loadPersistedAuth: () => {
    const user = storageUtils.get<User>(STORAGE_KEYS.USER);
    const tokens = storageUtils.get<AuthTokens>(STORAGE_KEYS.AUTH_TOKENS);
    const biometricEnabled =
      storageUtils.getBoolean(STORAGE_KEYS.BIOMETRIC_ENABLED) ?? false;

    if (user && tokens) {
      set({
        user,
        tokens,
        isAuthenticated: true,
        biometricEnabled,
      });
      api.setAuthToken(tokens.accessToken);
      socketService.connect();
    }
  },
}));
