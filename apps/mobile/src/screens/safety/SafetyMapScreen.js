import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  SafeAreaView, Dimensions, ScrollView, FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { getPublicMapEvents } from './services/safetyService';
import HazardMarker from './components/HazardMarker';


const { width } = Dimensions.get('window');

// Defensive react-native-maps import
let MapView, Marker, Callout;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
} catch (_e) {
  MapView = null;
  Marker = null;
  Callout = null;
}

// Defensive Location import
let Location;
try {
  Location = require('expo-location');
} catch (_e) {
  Location = null;
}

const defaultRegion = {
  latitude: 28.6419,
  longitude: 77.2194,
  latitudeDelta: 12.0,
  longitudeDelta: 12.0,
};

export default function SafetyMapScreen() {
  const navigation = useNavigation();
  const [region, setRegion] = useState(defaultRegion);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL, SOS, COMPARTMENT, HAZARD

  useEffect(() => {
    let active = true;
    const getCoordinates = async () => {
      try {
        if (Location) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted' && active) {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.15,
              longitudeDelta: 0.15,
            });
          }
        }
      } catch (err) {
        console.warn('Map location permission or retrieval failed:', err.message);
      }
    };
    getCoordinates();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedFilter !== 'ALL') {
          if (selectedFilter === 'SOS') params.type = 'SOS';
          else if (selectedFilter === 'COMPARTMENT') params.type = 'COMPARTMENT_VIOLATION';
          else if (selectedFilter === 'HAZARD') params.type = 'HAZARD_REPORT';
        }
        const response = await getPublicMapEvents(params);
        if (active) {
          const data = response?.data?.data || response?.data || [];
          const validData = data.filter(e => e.lat && e.lng && !isNaN(e.lat) && !isNaN(e.lng));
          setEvents(validData);
        }
      } catch (err) {
        console.error('[SafetyMap] Failed to load public map events:', err.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchEvents();
    return () => { active = false; };
  }, [selectedFilter]);

  const getEventMarkerConfig = (type) => {
    switch (type) {
      case 'SOS':
        return { color: '#CC0000', icon: '🚨', label: 'SOS Alert' };
      case 'COMPARTMENT_VIOLATION':
        return { color: '#E8621A', icon: '👤', label: 'Compartment violation' };
      case 'HAZARD_REPORT':
        return { color: '#F5A623', icon: '⚠️', label: 'Hazard' };
      default:
        return { color: '#7B8A9E', icon: '📌', label: 'Incident' };
    }
  };

  const renderFilterChip = (filterType, label) => {
    const isSelected = selectedFilter === filterType;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isSelected && styles.filterChipActive]}
        onPress={() => setSelectedFilter(filterType)}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEventItem = ({ item }) => {
    const config = getEventMarkerConfig(item.event_type);
    return (
      <View style={styles.eventCard}>
        <View style={[styles.eventIconBg, { backgroundColor: config.color + '15' }]}>
          <Text style={{ fontSize: 18 }}>{config.icon}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{config.label} - {item.alert_subtype.replace(/_/g, ' ')}</Text>
          <Text style={styles.eventSub}>
            {item.train_number ? `Train ${item.train_number}` : 'Station Area'} • {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color="#1A3557" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Hotspot Map</Text>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {renderFilterChip('ALL', 'All Incidents')}
          {renderFilterChip('SOS', '🚨 SOS Alerts')}
          {renderFilterChip('COMPARTMENT', '👤 Compartment')}
          {renderFilterChip('HAZARD', '⚠️ Hazards')}
        </ScrollView>
      </View>

      {/* Main Map or Fallback Panel */}
      <View style={styles.mapContainer}>
        {MapView ? (
          <>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={(r) => setRegion(r)}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {events.map((event) => {
                const config = getEventMarkerConfig(event.event_type);
                return (
                  <Marker
                    key={event.id}
                    coordinate={{ latitude: Number(event.lat), longitude: Number(event.lng) }}
                    title={config.label}
                    description={event.alert_subtype.replace(/_/g, ' ')}
                  >
                    <HazardMarker eventType={event.event_type} />
                    <Callout tooltip>
                      <View style={styles.calloutBubble}>
                        <Text style={styles.calloutTitle}>{config.label}</Text>
                        <Text style={styles.calloutSub}>{event.alert_subtype.replace(/_/g, ' ')}</Text>
                        {event.train_number ? (
                          <Text style={styles.calloutDetail}>Train: {event.train_number}</Text>
                        ) : null}
                        <Text style={styles.calloutTime}>
                          {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>

            {loading && (
              <View style={styles.mapLoader}>
                <ActivityIndicator size="small" color="#E8621A" />
              </View>
            )}
          </>
        ) : (
          /* Fallback Screen for Unsupported Environments (Web/Simulators without Google Maps) */
          <View style={styles.fallbackContainer}>
            <View style={styles.fallbackHeader}>
              <Text style={styles.fallbackTitle}>Interactive Map Sandbox</Text>
              <Text style={styles.fallbackSubtitle}>
                Map visualizations require Google Maps SDK. Displaying list of active safety hotspots.
              </Text>
            </View>

            {loading ? (
              <View style={styles.centre}>
                <ActivityIndicator size="large" color="#E8621A" />
              </View>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={renderEventItem}
                contentContainerStyle={styles.fallbackList}
                ListEmptyComponent={
                  <View style={styles.centre}>
                    <Text style={styles.emptyIcon}>🛡️</Text>
                    <Text style={styles.emptyTitle}>No active reports</Text>
                    <Text style={styles.emptySubtitle}>No safety events match the selected category.</Text>
                  </View>
                }
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A3557',
  },
  filterRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#FFF8F4',
    borderColor: '#E8621A',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#E8621A',
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: width,
    height: '100%',
  },
  mapLoader: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 20,
    elevation: 3,
  },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  markerText: {
    fontSize: 14,
  },
  calloutBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: 150,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  calloutTitle: {
    fontWeight: 'bold',
    color: '#1A3557',
    fontSize: 12,
    marginBottom: 4,
  },
  calloutSub: {
    color: '#E8621A',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutDetail: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 9,
    color: '#7B8A9E',
    marginTop: 4,
  },
  /* Fallback List Styles */
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  fallbackHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A3557',
    marginBottom: 4,
  },
  fallbackSubtitle: {
    fontSize: 11,
    color: '#7B8A9E',
    lineHeight: 16,
  },
  fallbackList: {
    padding: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  eventIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A3557',
  },
  eventSub: {
    fontSize: 11,
    color: '#7B8A9E',
    marginTop: 2,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A3557',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#7B8A9E',
    textAlign: 'center',
  },
});
