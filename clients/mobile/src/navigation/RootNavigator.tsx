import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuthStore} from '@/store/authStore';
import {useThemeStore} from '@/store/themeStore';
import {useChatStore} from '@/store/chatStore';
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';
import socketService from '@/services/socket';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const {isAuthenticated, loadPersistedAuth} = useAuthStore();
  const {colors} = useThemeStore();
  const {loadPersistedData} = useChatStore();

  useEffect(() => {
    loadPersistedAuth();
    loadPersistedData();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  const theme = {
    dark: colors === useThemeStore.getState().colors,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.notification,
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
