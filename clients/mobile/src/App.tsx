import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {RootNavigator} from './navigation/RootNavigator';
import {useThemeStore} from './store/themeStore';
import {NotificationService} from './services/notification';
import {PermissionService} from './services/permissions';
import socketService from './services/socket';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App: React.FC = () => {
  const {loadPersistedTheme, mode} = useThemeStore();

  useEffect(() => {
    loadPersistedTheme();
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Request permissions
      await PermissionService.requestNotificationPermission();

      // Initialize notifications
      await NotificationService.initialize();

      // Setup socket event listeners
      setupSocketListeners();
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const setupSocketListeners = () => {
    socketService.on('message:new', (message) => {
      NotificationService.displayMessageNotification(message);
    });

    socketService.on('call:incoming', (call) => {
      NotificationService.displayCallNotification(call);
    });
  };

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar
            barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent
          />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
