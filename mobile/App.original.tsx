import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useWindowDimensions, Platform, ActivityIndicator, View } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen from './src/screens/LoginScreen';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HistoryScreen from './src/screens/HistoryScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import { COLORS, SHADOWS } from './src/theme';
import { ResponsiveContainer } from './src/components/ResponsiveContainer';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: () => null, // Just text for MVP
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 15,
          fontWeight: '600'
        },
        tabBarStyle: {
          height: 60,
          borderTopWidth: 0, // Clean look
          ...SHADOWS.medium, // Floating feel
          backgroundColor: COLORS.card,
        },
        headerStyle: {
          backgroundColor: COLORS.card,
          shadowColor: 'transparent', // Remove header shadow for clean look
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTitleStyle: {
          color: COLORS.primary,
          fontWeight: 'bold',
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarLabel: '🏠 Home' }}
      />
      <Tab.Screen
        name="Routine"
        component={RoutineScreen}
        options={{ title: 'Routine', tabBarLabel: '✅ Routine' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false, tabBarLabel: '💬 Chat' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{ title: 'Skin History', tabBarLabel: '📜 History' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Settings', tabBarLabel: '⚙️ Settings' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { userToken, isLoading, hasProfile } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 1. Not Logged In -> Login Screen (Wrapped in ResponsiveContainer by parent)
  if (userToken == null) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  // 2. Logged In but No Profile -> Profile Setup
  if (!hasProfile) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  // 3. Logged In + Profile + Desktop -> WEB DASHBOARD
  if (isDesktop) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="WebDashboard" component={WebDashboardScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  // 4. Logged In + Profile + Mobile -> MOBILE TABS
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <ResponsiveContainer>
          <AppNavigator />
        </ResponsiveContainer>
      </AuthProvider>
    </NavigationContainer>
  );
}
