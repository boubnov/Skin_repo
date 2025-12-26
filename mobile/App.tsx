import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useWindowDimensions, Platform, ActivityIndicator, View, Text } from 'react-native';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import LoginScreen from './src/screens/LoginScreen';
// import HomeScreen from './src/screens/HomeScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ChatScreen from './src/screens/ChatScreen';
// import SettingsScreen from './src/screens/SettingsScreen';
import WebDashboardScreen from './src/screens/web/DashboardScreen'; // RENAMED & RESTORED
import ScannerScreen from './src/screens/ScannerScreen';

// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HistoryScreen from './src/screens/HistoryScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import ShelfScreen from './src/screens/ShelfScreen';
import { COLORS, SHADOWS } from './src/theme';
import { ResponsiveContainer } from './src/components/ResponsiveContainer';

const Stack = createNativeStackNavigator();
// const Tab = createBottomTabNavigator();

/*
function MainTabs() {
  return (
    <Tab.Navigator ... >
      ...
    </Tab.Navigator>
  );
}
*/

function AppNavigator() {
  const { userToken, isLoading, hasProfile } = useAuth();
  const { width } = useWindowDimensions();
  // FORCE DESKTOP MODE for debugging
  const isDesktop = true; // Platform.OS === 'web' && width > 768;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="WebDashboard" component={WebDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: "Scan Product" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <AuthProvider>
          <ResponsiveContainer>
            <AppNavigator />
          </ResponsiveContainer>
        </AuthProvider>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
