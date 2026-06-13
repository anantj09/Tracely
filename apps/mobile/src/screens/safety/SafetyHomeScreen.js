import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert as AlertNative, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTracely } from '../../context/TracelyContext';
import { postSOS } from './services/safetyService';
import SOSButton from './components/SOSButton';
import { ShieldAlert, AlertTriangle, Map, Users } from 'lucide-react-native';

const Alert = {
  alert: (title, message, buttons) => {
    if (Platform.OS === 'web') {
      const formattedMessage = title ? `${title}\n\n${message}` : message;
      window.alert(formattedMessage);
      if (buttons && buttons.length > 0) {
        const primaryButton = buttons.find(b => b.text === 'OK' || b.text === 'Yes') || buttons[0];
        if (primaryButton && typeof primaryButton.onPress === 'function') {
          primaryButton.onPress();
        }
      }
    } else {
      AlertNative.alert(title, message, buttons);
    }
  }
};

const { width } = Dimensions.get('window');

// Defensive location check
let Location;
try {
  Location = require('expo-location');
} catch (_e) {
  Location = null;
}

export default function SafetyHomeScreen() {
  const navigation = useNavigation();
  const { activeJourney } = useTracely();
  const [triggeringSOS, setTriggeringSOS] = useState(false);

  const getCoordinates = async () => {
    try {
      if (Location) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy?.Balanced || 3,
            timeout: 5000 
          });
          return { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      }
    } catch (_e) {
      console.warn('Location retrieval failed, using default coordinates:', _e.message);
    }
    // Fallback to New Delhi Station coordinates
    return { lat: 28.6419, lng: 77.2194 };
  };

  const handleSOSPress = async () => {
    if (triggeringSOS) return;
    setTriggeringSOS(true);

    try {
      // 1. Fetch current GPS location
      const coords = await getCoordinates();

      // 2. Build SOS payload using journey details
      const payload = {
        lat: coords.lat,
        lng: coords.lng,
        alert_subtype: 'PERSONAL_SAFETY',
        train_number: activeJourney?.train_number || '',
        coach: activeJourney?.coach || '',
        berth: activeJourney?.berth || '',
        station_code: activeJourney?.boarding_station || ''
      };

      // 3. Fire SOS request
      const response = await postSOS(payload);
      const event = response?.data?.data || response?.data || {};

      // 4. Navigate directly to active SOS screen
      navigation.navigate('SOSActive', { eventId: event.id || 'mock-sos-' + Date.now() });

    } catch (error) {
      console.error('Failed to trigger SOS:', error.message);
      Alert.alert(
        'SOS Error',
        'Could not trigger network SOS. Please call RPF at 182 immediately.',
        [
          { text: 'Call 182', onPress: () => {} },
          { text: 'OK' }
        ]
      );
    } finally {
      setTriggeringSOS(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Emergency Section */}
        <View style={styles.emergencyContainer}>
          <Text style={styles.emergencyHeader}>EMERGENCY PROTOCOL</Text>
          <Text style={styles.emergencySub}>Tap to trigger critical SOS & notify RPF</Text>
          
          <View style={styles.buttonWrapper}>
            <SOSButton onPress={handleSOSPress} />
          </View>

          {activeJourney && (
            <View style={styles.journeyBadge}>
              <Text style={styles.journeyText}>
                Active Journey: Train {activeJourney.train_number} ({activeJourney.coach || 'N/A'}, {activeJourney.berth || 'N/A'})
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Navigation Grid Section */}
        <View style={styles.gridContainer}>
          <Text style={styles.gridSectionTitle}>Safety & Security Actions</Text>
          
          <View style={styles.grid}>
            
            {/* Row 1 */}
            <View style={styles.gridRow}>
              
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('CompartmentAlert')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: '#FFECE0' }]}>
                  <ShieldAlert size={28} color="#E8621A" />
                </View>
                <Text style={styles.itemTitle}>Compartment Alert</Text>
                <Text style={styles.itemSubtitle}>Women security & violations</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('HazardReport')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: '#FFF7E6' }]}>
                  <AlertTriangle size={28} color="#D97706" />
                </View>
                <Text style={styles.itemTitle}>Report Hazard</Text>
                <Text style={styles.itemSubtitle}>Track/platform defects</Text>
              </TouchableOpacity>

            </View>

            {/* Row 2 */}
            <View style={styles.gridRow}>

              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('SafetyMap')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Map size={28} color="#0284C7" />
                </View>
                <Text style={styles.itemTitle}>Safety Map</Text>
                <Text style={styles.itemSubtitle}>Public heatmap & issues</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('TrustedContacts')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Users size={28} color="#059669" />
                </View>
                <Text style={styles.itemTitle}>Trusted Contacts</Text>
                <Text style={styles.itemSubtitle}>Emergency SMS list</Text>
              </TouchableOpacity>

            </View>

          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#CC0000',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emergencyContainer: {
    backgroundColor: '#CC0000',
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  emergencyHeader: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  emergencySub: {
    color: '#FFCCCC',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  buttonWrapper: {
    marginVertical: 24,
  },
  journeyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  journeyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flex: 1,
    padding: 20,
    marginTop: 10,
  },
  gridSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A3557',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  grid: {
    flex: 1,
    gap: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
    height: (width - 56) / 2, // square grid item layout
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A3557',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#7B8A9E',
    marginTop: 4,
    lineHeight: 14,
  },
});
