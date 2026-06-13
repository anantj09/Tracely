import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTracely } from '../context/TracelyContext';
import { SCREENS, COLORS } from '../constants';
import { Home, Clock, FileEdit, ShieldPlus, Building2 } from 'lucide-react-native';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import OTPVerifyScreen from '../screens/auth/OTPVerifyScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import HomeScreen from '../screens/home/HomeScreen';

// Import complaints screens
import ComplaintsHomeScreen from '../screens/complaints/ComplaintsHomeScreen';
import NewComplaintScreen from '../screens/complaints/NewComplaintScreen';
import ComplaintDetailScreen from '../screens/complaints/ComplaintDetailScreen';
import ReopenScreen from '../screens/complaints/ReopenScreen';
import StationNavigator from './StationNavigator';
import SafetyNavigator from './SafetyNavigator';

// Import Tatkal screens
import TatkalHomeScreen from '../screens/tatkal/TatkalHomeScreen';
import SurrenderMarketScreen from '../screens/tatkal/SurrenderMarketScreen';
import PreFillFormScreen from '../screens/tatkal/PreFillFormScreen';
import CountdownScreen from '../screens/tatkal/CountdownScreen';
import ConfirmationScreen from '../screens/tatkal/ConfirmationScreen';

// PublicHeatMapScreen uses react-native-maps which crashes on web.
// Wrap it so it only loads on native or gracefully falls back on web.
const PublicHeatMapFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
    <Text style={{ fontSize: 16, color: '#555' }}>Map view is not available on web.</Text>
    <Text style={{ fontSize: 13, color: '#AAA', marginTop: 8 }}>Please use the mobile app to view the complaint map.</Text>
  </View>
);

let PublicHeatMapScreen;
if (Platform.OS === 'web') {
  PublicHeatMapScreen = PublicHeatMapFallback;
} else {
  PublicHeatMapScreen = require('../screens/complaints/PublicHeatMapScreen').default;
}

// All screen placeholders and imports have been cleaned up and reordered to the top.

const TatkalStackNav = createStackNavigator();

function TatkalStack() {
  return (
    <TatkalStackNav.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#111111',
        },
        headerTitleAlign: 'center',
        headerTintColor: '#111111',
      }}
    >
      <TatkalStackNav.Screen
        name={SCREENS.TATKAL_HOME || 'TatkalHome'}
        component={TatkalHomeScreen}
        options={{ title: 'Tatkal Assist', headerShown: false }}
      />
      <TatkalStackNav.Screen
        name={SCREENS.TATKAL_SURRENDER_MARKET || 'TatkalSurrenderMarket'}
        component={SurrenderMarketScreen}
        options={{ title: 'Surrender Marketplace' }}
      />
      <TatkalStackNav.Screen
        name={SCREENS.TATKAL_PREFILL || 'TatkalPrefill'}
        component={PreFillFormScreen}
        options={{ title: 'Create Prefill Request' }}
      />
      <TatkalStackNav.Screen
        name={SCREENS.TATKAL_COUNTDOWN || 'TatkalCountdown'}
        component={CountdownScreen}
        options={{ title: 'Booking Countdown', headerShown: false }}
      />
      <TatkalStackNav.Screen
        name={SCREENS.TATKAL_CONFIRMATION || 'TatkalConfirmation'}
        component={ConfirmationScreen}
        options={{ title: 'Booking Confirmed', headerShown: false }}
      />
    </TatkalStackNav.Navigator>
  );
}

// Safety navigator is imported directly above

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ComplaintsStackNav = createStackNavigator();

function ComplaintsStack() {
  return (
    <ComplaintsStackNav.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#111111',
        },
        headerTitleAlign: 'center',
        headerTintColor: '#111111', // back arrow colour
      }}
    >
      <ComplaintsStackNav.Screen
        name={SCREENS.COMPLAINTS_HOME}
        component={ComplaintsHomeScreen}
        options={{ title: 'Complaints', headerShown: false }}
      />
      <ComplaintsStackNav.Screen
        name={SCREENS.NEW_COMPLAINT}
        component={NewComplaintScreen}
        options={{ title: 'File a Grievance' }}
      />
      <ComplaintsStackNav.Screen
        name={SCREENS.COMPLAINT_DETAIL}
        component={ComplaintDetailScreen}
        options={{ title: 'Complaint Details' }}
      />
      <ComplaintsStackNav.Screen
        name={SCREENS.REOPEN}
        component={ReopenScreen}
        options={{ title: 'Reopen Complaint' }}
      />
      <ComplaintsStackNav.Screen
        name={SCREENS.PUBLIC_HEAT_MAP}
        component={PublicHeatMapScreen}
        options={{ title: 'Live Complaint Map', headerShown: false }}
      />
    </ComplaintsStackNav.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.brandOrange,
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarStyle: {
          height: 60,
          borderTopWidth: 1,
          borderTopColor: COLORS.dividerGrey,
          backgroundColor: COLORS.pageWhite,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          height: 56,
          backgroundColor: COLORS.pageWhite,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.dividerGrey,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: COLORS.textPrimary,
        },
        headerTitleAlign: 'center',
      }}
    >
      <Tab.Screen
        name={SCREENS.HOME}
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.TATKAL}
        component={TatkalStack}
        options={{
          title: 'Tatkal Assist',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.COMPLAINTS}
        component={ComplaintsStack}
        options={{
          title: 'Complaints',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <FileEdit color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.SAFETY}
        component={SafetyNavigator}
        options={{
          title: 'Safety & SOS',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <ShieldPlus color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.STATION}
        component={StationNavigator}
        options={{
          title: 'Station Guide',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Building2 color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, currentUser, loading } = useTracely();

  if (loading && !token) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Tracely...</Text>
      </View>
    );
  }

  const isLoggedIn = !!token;
  const isProfileIncomplete = isLoggedIn && currentUser && !currentUser.name;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name={SCREENS.LOGIN} component={LoginScreen} />
            <Stack.Screen name={SCREENS.OTP_VERIFY} component={OTPVerifyScreen} />
            <Stack.Screen name={SCREENS.REGISTER} component={RegisterScreen} />
          </>
        ) : isProfileIncomplete ? (
          <Stack.Screen name={SCREENS.PROFILE_SETUP} component={ProfileSetupScreen} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#E8621A',
    fontWeight: '600',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A3557',
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#E8621A',
    fontWeight: '600',
    marginTop: 4,
  },
});
