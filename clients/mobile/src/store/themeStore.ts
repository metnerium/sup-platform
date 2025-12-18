import {create} from 'zustand';
import {useColorScheme} from 'react-native';
import {colors} from '@/constants/theme';
import storageUtils from '@/utils/storage';
import {STORAGE_KEYS} from '@/constants/config';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  colors: typeof colors.light;

  // Actions
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  loadPersistedTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  colors: colors.light,

  setTheme: (mode) => {
    const systemTheme = useColorScheme();
    const effectiveTheme =
      mode === 'system' ? systemTheme || 'light' : mode;

    set({
      mode,
      colors: colors[effectiveTheme],
    });

    storageUtils.set(STORAGE_KEYS.THEME, mode);
  },

  toggleTheme: () => {
    const {mode} = get();
    const newMode = mode === 'light' ? 'dark' : 'light';
    get().setTheme(newMode);
  },

  loadPersistedTheme: () => {
    const savedTheme = storageUtils.get<ThemeMode>(STORAGE_KEYS.THEME);
    if (savedTheme) {
      get().setTheme(savedTheme);
    }
  },
}));
