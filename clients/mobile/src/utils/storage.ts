import {MMKV} from 'react-native-mmkv';

const storage = new MMKV({
  id: 'sup-messenger-storage',
  encryptionKey: 'sup-messenger-encryption-key',
});

export const mmkvStorage = {
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  getItem: (key: string): string | null => {
    const value = storage.getString(key);
    return value ?? null;
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clearAll();
  },
};

export const storageUtils = {
  set: <T>(key: string, value: T): void => {
    try {
      const jsonValue = JSON.stringify(value);
      storage.set(key, jsonValue);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
    }
  },

  get: <T>(key: string): T | null => {
    try {
      const jsonValue = storage.getString(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return null;
    }
  },

  remove: (key: string): void => {
    try {
      storage.delete(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
    }
  },

  clear: (): void => {
    try {
      storage.clearAll();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  getAllKeys: (): string[] => {
    try {
      return storage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },

  contains: (key: string): boolean => {
    return storage.contains(key);
  },

  setBoolean: (key: string, value: boolean): void => {
    storage.set(key, value);
  },

  getBoolean: (key: string): boolean | null => {
    const value = storage.getBoolean(key);
    return value ?? null;
  },

  setNumber: (key: string, value: number): void => {
    storage.set(key, value);
  },

  getNumber: (key: string): number | null => {
    const value = storage.getNumber(key);
    return value ?? null;
  },
};

export default storageUtils;
