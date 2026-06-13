import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MARKER_CONFIG = {
  SOS: { backgroundColor: '#CC0000', icon: '!', borderColor: '#8B0000' },
  COMPARTMENT_VIOLATION: { backgroundColor: '#E8621A', icon: 'W', borderColor: '#B04000' },
  HAZARD_REPORT: { backgroundColor: '#F5A623', icon: '⚠', borderColor: '#C07800' },
  DEFAULT: { backgroundColor: '#757575', icon: '?', borderColor: '#424242' },
};

/**
 * HazardMarker — custom map pin for SafetyMapScreen.
 * Render inside a react-native-maps <Marker> component.
 * Props:
 *   eventType  {string}   — 'SOS' | 'COMPARTMENT_VIOLATION' | 'HAZARD_REPORT'
 *   size       {number}   — marker diameter in dp (default 28)
 */
export default function HazardMarker({ eventType, size = 28 }) {
  const config = MARKER_CONFIG[eventType] || MARKER_CONFIG.DEFAULT;
  const borderRadius = size / 2;
  const iconSize = size * 0.5;

  return (
    <View
      style={[
        styles.marker,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: iconSize, color: '#FFFFFF' }]}>
        {config.icon}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
  },
  icon: {
    fontWeight: 'bold',
  },
});
