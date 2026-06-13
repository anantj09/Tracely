import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  SafeAreaView, Dimensions, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { getPublicMapEvents } from './services/safetyService';

const { width } = Dimensions.get('window');

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

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no,width=device-width" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #FAFAFA; }
    .leaflet-control-attribution { display: none; }
    .custom-popup .leaflet-popup-content-wrapper {
      background: #ffffff;
      color: #111111;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([28.6419, 77.2194], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(map);

    var layersGroup = L.layerGroup().addTo(map);

    function centerMap(lat, lng) {
      map.setView([lat, lng], 14);
    }

    function getEventConfig(type) {
      switch (type) {
        case 'SOS':
          return { color: '#CC0000', icon: '🚨', label: 'SOS Alert' };
        case 'COMPARTMENT_VIOLATION':
          return { color: '#E8621A', icon: '👤', label: 'Compartment Violation' };
        case 'HAZARD_REPORT':
          return { color: '#F5A623', icon: '⚠️', label: 'Hazard' };
        default:
          return { color: '#7B8A9E', icon: '📌', label: 'Incident' };
      }
    }

    function loadEvents(events) {
      try {
        layersGroup.clearLayers();
        if (events && events.length > 0) {
          var bounds = [];
          events.forEach(function(event) {
            if (!event.lat || !event.lng) return;
            var lat = parseFloat(event.lat);
            var lng = parseFloat(event.lng);
            var config = getEventConfig(event.event_type);
            
            var iconHtml = '<div style="background-color: ' + config.color + '; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 14px;">' + config.icon + '</div>';
            var customIcon = L.divIcon({
              html: iconHtml,
              className: 'custom-div-icon',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });

            var formattedTime = '';
            if (event.created_at) {
              var date = new Date(event.created_at);
              formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            var popupContent = '<div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">' +
              '<b style="color: #1A3557; font-size: 14px;">' + config.label + '</b><br/>' +
              '<span style="color: #E8621A; font-weight: 600;">' + event.alert_subtype.replace(/_/g, ' ') + '</span><br/>' +
              (event.train_number ? 'Train: ' + event.train_number + '<br/>' : '') +
              '<span style="color: #7B8A9E; font-size: 11px;">' + formattedTime + '</span>' +
              '</div>';

            var marker = L.marker([lat, lng], { icon: customIcon }).addTo(layersGroup);
            marker.bindPopup(popupContent, { className: 'custom-popup' });
            
            bounds.push([lat, lng]);
          });

          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
          }
        }
      } catch (err) {
        // Silent error
      }
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
  </script>
</body>
</html>
`;

export default function SafetyMapScreen() {
  const navigation = useNavigation();
  const [region, setRegion] = useState(defaultRegion);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL, SOS, COMPARTMENT, HAZARD

  const webViewRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let active = true;
    const getCoordinates = async () => {
      try {
        if (Location) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted' && active) {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            setRegion({
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.15,
              longitudeDelta: 0.15,
            });
            if (isMapReady) {
              const js = `centerMap(${lat}, ${lng}); true;`;
              webViewRef.current?.injectJavaScript(js);
            }
          }
        }
      } catch (err) {
        console.warn('Map location permission or retrieval failed:', err.message);
      }
    };
    getCoordinates();
    return () => { active = false; };
  }, [isMapReady]);

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

  // Center map on ready or region update
  useEffect(() => {
    if (isMapReady && region) {
      const js = `centerMap(${region.latitude}, ${region.longitude}); true;`;
      webViewRef.current?.injectJavaScript(js);
    }
  }, [isMapReady, region.latitude, region.longitude]);

  // Update events inside Leaflet on maps ready
  useEffect(() => {
    if (isMapReady) {
      const js = `loadEvents(${JSON.stringify(events)}); true;`;
      webViewRef.current?.injectJavaScript(js);
    }
  }, [isMapReady, events]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'READY') {
        setIsMapReady(true);
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  const renderFilterChip = (filterType, label) => {
    const isSelected = selectedFilter === filterType;
    return (
      <TouchableOpacity
        key={filterType}
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

      {/* Main Map Panel */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: LEAFLET_HTML }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {loading && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="small" color="#E8621A" />
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
