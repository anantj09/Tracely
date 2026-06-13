import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';

/**
 * SOSButton Component
 * A large, premium red circular button that infinitely pulses concentric rings
 * behind it on mount. Optimized to run on the native thread (60fps) without phase drift.
 * 
 * Props:
 * - onPress: callback function executed when the button is tapped
 */
export default function SOSButton({ onPress }) {
  const [pulse1] = React.useState(() => new Animated.Value(0));
  const [pulse2] = React.useState(() => new Animated.Value(0));

  useEffect(() => {
    // Reset values to start fresh
    pulse1.setValue(0);
    pulse2.setValue(0);

    // Primary loop for the first concentric ring
    const anim1 = Animated.loop(
      Animated.timing(pulse1, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    let anim2;

    // Start the second timing loop exactly 1000ms out-of-phase (180 degrees)
    const startTimeout = setTimeout(() => {
      anim2 = Animated.loop(
        Animated.timing(pulse2, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      anim2.start();
    }, 1000);

    anim1.start();

    return () => {
      clearTimeout(startTimeout);
      anim1.stop();
      if (anim2) {
        anim2.stop();
      }
    };
  }, [pulse1, pulse2]);

  // Interpolations for Ring 1
  const scale1 = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const opacity1 = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  // Interpolations for Ring 2
  const scale2 = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const opacity2 = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <View style={styles.container}>
      {/* Pulsing Concentric Ring 1 */}
      <Animated.View
        style={[
          styles.ring,
          {
            transform: [{ scale: scale1 }],
            opacity: opacity1,
          },
        ]}
      />

      {/* Pulsing Concentric Ring 2 */}
      <Animated.View
        style={[
          styles.ring,
          {
            transform: [{ scale: scale2 }],
            opacity: opacity2,
          },
        ]}
      />

      {/* Main Large Red SOS Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 170,
    height: 170,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#CC0000',
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});
