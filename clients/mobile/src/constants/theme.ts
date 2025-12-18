import {Platform} from 'react-native';

export const colors = {
  light: {
    primary: '#0066FF',
    primaryDark: '#0052CC',
    primaryLight: '#3385FF',
    secondary: '#00D9A3',
    background: '#FFFFFF',
    surface: '#F5F7FA',
    surfaceVariant: '#E8ECF2',
    border: '#E0E5EB',
    text: '#1A1D1F',
    textSecondary: '#6F7782',
    textTertiary: '#9CA3AF',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#007AFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    card: '#FFFFFF',
    notification: '#FF3B30',
    sent: '#0066FF',
    received: '#F5F7FA',
    online: '#34C759',
    offline: '#9CA3AF',
    typing: '#0066FF',
    link: '#0066FF',
    divider: '#E0E5EB',
    placeholder: '#9CA3AF',
    disabled: '#D1D5DB',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    primary: '#3385FF',
    primaryDark: '#0052CC',
    primaryLight: '#5FA3FF',
    secondary: '#00D9A3',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceVariant: '#2C2C2E',
    border: '#38383A',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    textTertiary: '#6E6E73',
    error: '#FF453A',
    success: '#30D158',
    warning: '#FF9F0A',
    info: '#0A84FF',
    overlay: 'rgba(0, 0, 0, 0.7)',
    card: '#1C1C1E',
    notification: '#FF453A',
    sent: '#3385FF',
    received: '#2C2C2E',
    online: '#30D158',
    offline: '#6E6E73',
    typing: '#3385FF',
    link: '#3385FF',
    divider: '#38383A',
    placeholder: '#6E6E73',
    disabled: '#48484A',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  smallBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
};

export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    linear: 'linear' as const,
    ease: 'ease' as const,
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
  },
};

export const layout = {
  maxWidth: 768,
  headerHeight: 56,
  tabBarHeight: 56,
  inputHeight: 48,
  avatarSize: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
    xxl: 120,
  },
};
