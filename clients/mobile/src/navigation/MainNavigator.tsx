import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useThemeStore} from '@/store/themeStore';
import {ChatListScreen} from '@/screens/chat/ChatListScreen';
import {ChatScreen} from '@/screens/chat/ChatScreen';
import {StoriesScreen} from '@/screens/story/StoriesScreen';
import {CallsScreen} from '@/screens/call/CallsScreen';
import {SettingsScreen} from '@/screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ChatStack = () => {
  const {colors} = useThemeStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      }}>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{title: 'Chats'}}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({route}: any) => ({
          title: route.params?.conversationName || 'Chat',
        })}
      />
    </Stack.Navigator>
  );
};

const StoriesStack = () => {
  const {colors} = useThemeStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      }}>
      <Stack.Screen
        name="StoriesList"
        component={StoriesScreen}
        options={{title: 'Stories'}}
      />
    </Stack.Navigator>
  );
};

const CallsStack = () => {
  const {colors} = useThemeStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      }}>
      <Stack.Screen
        name="CallsList"
        component={CallsScreen}
        options={{title: 'Calls'}}
      />
    </Stack.Navigator>
  );
};

const SettingsStack = () => {
  const {colors} = useThemeStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      }}>
      <Stack.Screen
        name="SettingsList"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
    </Stack.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  const {colors} = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}>
      <Tab.Screen
        name="Chats"
        component={ChatStack}
        options={{
          tabBarIcon: ({color}) => <Text style={{fontSize: 24}}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Stories"
        component={StoriesStack}
        options={{
          tabBarIcon: ({color}) => <Text style={{fontSize: 24}}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsStack}
        options={{
          tabBarIcon: ({color}) => <Text style={{fontSize: 24}}>📞</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({color}) => <Text style={{fontSize: 24}}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
