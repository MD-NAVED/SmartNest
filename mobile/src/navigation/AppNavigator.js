import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Auth Context
import { AuthContext } from '../context/AuthContext';
import { registerUnauthorizedHandler } from '../api/client';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddDeviceScreen from '../screens/AddDeviceScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RoomsScreen from '../screens/RoomsScreen';
import SchedulesScreen from '../screens/SchedulesScreen';
import AlertsScreen from '../screens/AlertsScreen';

const AuthStack = createStackNavigator();
const HomeStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack for Home and Add Device screens
function HomeStackScreen() {
  const theme = useTheme();
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <HomeStack.Screen 
        name="DevicesHome" 
        component={DashboardScreen} 
        options={{ title: '4Layers' }} 
      />
      <HomeStack.Screen 
        name="AddDevice" 
        component={AddDeviceScreen} 
        options={{ title: 'Add New Device' }} 
      />
      <HomeStack.Screen 
        name="Rooms" 
        component={RoomsScreen} 
        options={{ title: 'Rooms' }} 
      />
      <HomeStack.Screen 
        name="Alerts" 
        component={AlertsScreen} 
        options={{ title: 'Alerts' }} 
      />
    </HomeStack.Navigator>
  );
}

// Navigation structure
export default function AppNavigator() {
  const theme = useTheme();
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.token,
            isLoading: false,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  useEffect(() => {
    // Fetch the token from storage then navigate to our appropriate place
    const bootstrapAsync = async () => {
      let userToken;
      try {
        userToken = await AsyncStorage.getItem('user_token');
      } catch (e) {
        console.error('Failed to load token:', e);
      }
      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    };

    bootstrapAsync();
    
    // Register the 401 interceptor auto-logout callback
    registerUnauthorizedHandler(() => {
      dispatch({ type: 'SIGN_OUT' });
    });
  }, []);

  const authContextValue = useMemo(
    () => ({
      signIn: async (token) => {
        await AsyncStorage.setItem('user_token', token);
        dispatch({ type: 'SIGN_IN', token });
      },
      signOut: async () => {
        await AsyncStorage.removeItem('user_token');
        dispatch({ type: 'SIGN_OUT' });
      },
      userToken: state.userToken,
    }),
    [state.userToken]
  );

  if (state.isLoading) {
    // Spinner screen while loading token status
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <NavigationContainer>
        {state.userToken == null ? (
          // User is NOT logged in
          <AuthStack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
          </AuthStack.Navigator>
        ) : (
          // User IS logged in - Show main app with bottom tabs
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ color, size }) => {
                let iconName;
                if (route.name === 'HomeTab') {
                  iconName = 'home-variant';
                } else if (route.name === 'HistoryTab') {
                  iconName = 'clock-digital';
                } else if (route.name === 'SchedulesTab') {
                  iconName = 'calendar-clock';
                } else if (route.name === 'SettingsTab') {
                  iconName = 'cog';
                }
                return <MaterialCommunityIcons name={iconName} size={size + 2} color={color} />;
              },
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
              tabBarStyle: {
                backgroundColor: theme.colors.surface,
                height: 64,
                borderTopWidth: 1.5,
                borderTopColor: '#262626',
                paddingBottom: Platform.OS === 'ios' ? 12 : 8,
                paddingTop: 8,
              },
              headerStyle: { 
                backgroundColor: theme.colors.surface,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1.5,
                borderBottomColor: '#262626',
              },
              headerTintColor: theme.colors.onSurface,
              headerTitleStyle: { fontWeight: '900', letterSpacing: 0.8 },
              tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: -2 },
            })}
          >
            <Tab.Screen
              name="HomeTab"
              component={HomeStackScreen}
              options={{ title: 'Home', headerShown: false }}
            />
            <Tab.Screen
              name="HistoryTab"
              component={HistoryScreen}
              options={{ title: 'Event History' }}
            />
            <Tab.Screen
              name="SchedulesTab"
              component={SchedulesScreen}
              options={{ title: 'Schedules' }}
            />
            <Tab.Screen
              name="SettingsTab"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </Tab.Navigator>
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
