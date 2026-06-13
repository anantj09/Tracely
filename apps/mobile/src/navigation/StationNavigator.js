import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { COLORS } from '../constants'

// Import all station screens (use lazy imports via require to avoid
// circular dependency issues during development)
import StationHomeScreen from '../screens/station/StationHomeScreen'
import IntentFormScreen from '../screens/station/IntentFormScreen'
import CrowdingResultScreen from '../screens/station/CrowdingResultScreen'
import StationSelectScreen from '../screens/station/StationSelectScreen'
import StationSchematicScreen from '../screens/station/StationSchematicScreen'
import AmenityDetailScreen from '../screens/station/AmenityDetailScreen'
import VendorDetailScreen from '../screens/station/VendorDetailScreen'
import RateVendorScreen from '../screens/station/RateVendorScreen'
import ReportHawkerScreen from '../screens/station/ReportHawkerScreen'
import CheckInScreen from '../screens/station/CheckInScreen'

const Stack = createStackNavigator()

export default function StationNavigator() {
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
        headerTintColor: COLORS.brandOrange,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="StationHome"
        component={StationHomeScreen}
        options={{ title: 'Station Guide', headerShown: false }}
      />
      <Stack.Screen name="IntentForm" component={IntentFormScreen}
        options={{ title: 'Plan My Journey' }} />
      <Stack.Screen name="CrowdingResult" component={CrowdingResultScreen}
        options={{ title: 'Crowding Forecast' }} />
      <Stack.Screen name="StationSelect" component={StationSelectScreen}
        options={{ title: 'Select Station' }} />
      <Stack.Screen name="StationSchematic" component={StationSchematicScreen}
        options={({ route }) => ({ title: route.params?.stationName || 'Station Map' })} />
      <Stack.Screen name="AmenityDetail" component={AmenityDetailScreen}
        options={{ title: 'Amenity Details' }} />
      <Stack.Screen name="VendorDetail" component={VendorDetailScreen}
        options={{ title: 'Vendor Details' }} />
      <Stack.Screen name="RateVendor" component={RateVendorScreen}
        options={{ title: 'Rate Vendor' }} />
      <Stack.Screen name="ReportHawker" component={ReportHawkerScreen}
        options={{ title: 'Report Unlicensed Vendor' }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen}
        options={{ title: 'Station Check-In' }} />
    </Stack.Navigator>
  )
}
