import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS } from '../constants';

import SafetyHomeScreen from '../screens/safety/SafetyHomeScreen';
import SOSActiveScreen from '../screens/safety/SOSActiveScreen';
import CompartmentAlertScreen from '../screens/safety/CompartmentAlertScreen';
import HazardReportScreen from '../screens/safety/HazardReportScreen';
import SafetyMapScreen from '../screens/safety/SafetyMapScreen';
import TrustedContactsScreen from '../screens/safety/TrustedContactsScreen';
import MyEventsScreen from '../screens/safety/MyEventsScreen';

const Stack = createStackNavigator();

export default function SafetyNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.pageWhite,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.dividerGrey,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: COLORS.textPrimary,
        },
        headerTitleAlign: 'center',
        headerTintColor: COLORS.brandOrange,
      }}
    >
      <Stack.Screen
        name="SafetyHomeScreen"
        component={SafetyHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SOSActive"
        component={SOSActiveScreen}
        options={{
          headerShown: false,        // SOSActiveScreen is full-screen red
          gestureEnabled: false,     // Prevent swipe-back during active SOS
        }}
      />
      <Stack.Screen
        name="CompartmentAlert"
        component={CompartmentAlertScreen}
        options={{ title: 'Compartment Alert' }}
      />
      <Stack.Screen
        name="HazardReport"
        component={HazardReportScreen}
        options={{ title: 'Report Hazard' }}
      />
      <Stack.Screen
        name="SafetyMap"
        component={SafetyMapScreen}
        options={{ headerShown: false }}  // Map is full-screen
      />
      <Stack.Screen
        name="TrustedContacts"
        component={TrustedContactsScreen}
        options={{ title: 'Trusted Contacts' }}
      />
      <Stack.Screen
        name="MyEvents"
        component={MyEventsScreen}
        options={{ title: 'My Safety Events' }}
      />
    </Stack.Navigator>
  );
}
