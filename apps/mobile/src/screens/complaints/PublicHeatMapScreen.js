// IMPORTANT: Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in apps/mobile/.env
// In app.json (or app.config.js), the Google Maps key needs to be set:
// "android": { "config": { "googleMaps": { "apiKey": "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" } } },
// "ios": { "config": { "googleMapsApiKey": "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" } }

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
// import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import { AlertTriangle } from 'lucide-react-native';
import { getHeatmapData, getPublicStats, getTrainRoutesData } from './services/complaintService';
// import StationMarker from './components/StationMarker';
import { StationBottomSheet } from './components/StationMarker';
import { COLORS } from '../../constants';

// HTML content for Leaflet Map using OpenStreetMap tiles
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
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(map);

    var layersGroup = L.layerGroup().addTo(map);

    // Generate smooth curved coordinates between station nodes using quadratic Bezier curves
    function getSmoothPath(stations, segments) {
      segments = segments || 10;
      if (stations.length < 2) return stations.map(function(s) { return [Number(s.lat), Number(s.lng)]; });
      
      var path = [];
      for (var i = 0; i < stations.length - 1; i++) {
        var p1 = stations[i];
        var p2 = stations[i + 1];
        
        var lat1 = Number(p1.lat);
        var lng1 = Number(p1.lng);
        var lat2 = Number(p2.lat);
        var lng2 = Number(p2.lng);
        
        var midLat = (lat1 + lat2) / 2;
        var midLng = (lng1 + lng2) / 2;
        
        var dLat = lat2 - lat1;
        var dLng = lng2 - lng1;
        var dist = Math.sqrt(dLat * dLat + dLng * dLng);
        
        var controlLat = midLat;
        var controlLng = midLng;
        
        if (dist > 0.1) {
          var offsetFactor = 0.025; // Tight 2.5% curve bend to avoid ocean overshoots
          var nx = -dLng / dist;
          var ny = dLat / dist;
          var offset = dist * offsetFactor;
          
          // Alternate curve direction to create an organic winding shape
          var sign = (i % 2 === 0) ? 1 : -1;
          
          controlLat = midLat + ny * offset * sign;
          controlLng = midLng + nx * offset * sign;
        }
        
        var startStep = (i === 0) ? 0 : 1;
        for (var step = startStep; step <= segments; step++) {
          var t = step / segments;
          var mt = 1 - t;
          var lat = mt * mt * lat1 + 2 * mt * t * controlLat + t * t * lat2;
          var lng = mt * mt * lng1 + 2 * mt * t * controlLng + t * t * lng2;
          path.push([lat, lng]);
        }
      }
      return path;
    }

    function getPolylineColor(count) {
      if (count <= 3) return '#27AE60'; // Green
      if (count <= 9) return '#F5A623'; // Amber
      return '#CC0000'; // Red
    }

    function loadStations(stations) {
      try {
        layersGroup.clearLayers();
        if (stations && stations.length > 0) {
          var bounds = [];
          stations.forEach(function(station) {
            if (!station.lat || !station.lng) return;
            var lat = parseFloat(station.lat);
            var lng = parseFloat(station.lng);
            
            var color = '#27AE60';
            var fill = '#27AE60';
            if (station.total_complaints > 30) {
              color = '#CC0000';
              fill = '#CC0000';
            } else if (station.total_complaints > 10) {
              color = '#E8621A';
              fill = '#E8621A';
            }
            
            var radius = Math.min(Math.max(15000, station.total_complaints * 3000), 80000);
            
            // Circle representing heat
            var circle = L.circle([lat, lng], {
              color: color,
              fillColor: fill,
              fillOpacity: 0.4,
              radius: radius,
              weight: 1.5
            }).addTo(layersGroup);
            
            // Small center marker for exact location
            var centerMarker = L.circleMarker([lat, lng], {
              color: '#FFFFFF',
              fillColor: color,
              fillOpacity: 0.9,
              radius: 6,
              weight: 1.5
            }).addTo(layersGroup);

            // Click action
            var handleClick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'STATION_CLICK',
                station: station
              }));
            };

            circle.on('click', handleClick);
            centerMarker.on('click', handleClick);
            
            bounds.push([lat, lng]);
          });

          // Adjust map view to fit all markers
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [35, 35] });
          }
        }
      } catch (err) {
        // Silent error
      }
    }

    function loadTrainRoutes(trains, selectedTrainNumber) {
      try {
        layersGroup.clearLayers();
        if (trains && trains.length > 0) {
          var bounds = [];
          trains.forEach(function(t) {
            if (!t.route || t.route.length === 0) return;
            var isSelected = selectedTrainNumber && t.train_number === selectedTrainNumber;
            var pathColor = getPolylineColor(t.total_complaints);
            
            // Draw Polyline
            var polylinePoints = getSmoothPath(t.route);
            
            var polylineOptions = {
              color: pathColor,
              weight: selectedTrainNumber ? (isSelected ? 6 : 1) : 3,
              opacity: selectedTrainNumber ? (isSelected ? 1.0 : 0.08) : 0.6
            };
            
            var polyline = L.polyline(polylinePoints, polylineOptions).addTo(layersGroup);
            
            // Add click handler
            var handleTrainClick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TRAIN_CLICK',
                train: t
              }));
            };

            polyline.on('click', handleTrainClick);
            
            // Collect bounds
            t.route.forEach(function(st) {
              if (st.lat && st.lng) {
                bounds.push([st.lat, st.lng]);
              }
            });
            
            // If this is the selected train, render intermediate stations as dots
            if (isSelected) {
              t.route.forEach(function(st) {
                if (!st.lat || !st.lng) return;
                var marker = L.circleMarker([st.lat, st.lng], {
                  color: '#1A3557',
                  fillColor: '#FFFFFF',
                  fillOpacity: 1.0,
                  radius: 5,
                  weight: 2
                }).addTo(layersGroup);
                
                marker.on('click', handleTrainClick);
              });
            }
          });
          
          // Center and fit map
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [35, 35] });
          }
        }
      } catch (err) {
        // Silent error
      }
    }

    // Notify React Native that Leaflet is loaded and ready
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
  </script>
</body>
</html>
`;

export default function PublicHeatMapScreen() {
  const [stations, setStations] = useState([]);
  const [stats, setStats] = useState(null);
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [mapMode, setMapMode] = useState('station'); // 'station' | 'train'
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedTrain, setSelectedTrain] = useState(null);

  const webViewRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const fetchMapAndStatsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [heatmapResult, statsResult, trainRoutesResult] = await Promise.all([
        getHeatmapData(),
        getPublicStats(),
        getTrainRoutesData(),
      ]);
      setStations(heatmapResult.data || []);
      setStats(statsResult.data || {});
      setTrains(trainRoutesResult.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapAndStatsData();
  }, []);

  // Send data to WebView when stations/trains are loaded and map is ready
  useEffect(() => {
    if (isMapReady) {
      if (mapMode === 'station' && stations.length > 0) {
        const js = `loadStations(${JSON.stringify(stations)}); true;`;
        webViewRef.current?.injectJavaScript(js);
      } else if (mapMode === 'train' && trains.length > 0) {
        const js = `loadTrainRoutes(${JSON.stringify(trains)}, ${selectedTrain ? JSON.stringify(selectedTrain.train_number) : 'null'}); true;`;
        webViewRef.current?.injectJavaScript(js);
      }
    }
  }, [isMapReady, mapMode, stations, trains, selectedTrain]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'READY') {
        setIsMapReady(true);
      } else if (data.type === 'STATION_CLICK') {
        setSelectedTrain(null);
        setSelectedStation(data.station);
      } else if (data.type === 'TRAIN_CLICK') {
        setSelectedStation(null);
        setSelectedTrain(data.train);
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  const handleMapModeChange = (mode) => {
    setMapMode(mode);
    setSelectedStation(null);
    setSelectedTrain(null);
  };

  /* Left commented out per user request for future changes/fallback to Google Maps:
  const getCircleColors = (complaints) => {
    if (complaints > 30) {
      return { fill: 'rgba(204, 0, 0, 0.4)', stroke: 'rgba(204, 0, 0, 0.8)' };
    } else if (complaints > 10) {
      return { fill: 'rgba(232, 98, 26, 0.4)', stroke: 'rgba(232, 98, 26, 0.8)' };
    } else {
      return { fill: 'rgba(39, 174, 96, 0.4)', stroke: 'rgba(39, 174, 96, 0.8)' };
    }
  };

  const handleMapPress = (e) => {
    if (selectedStation) setSelectedStation(null);
  };
  */

  return (
    <View style={styles.container}>
      {/* Leaflet Webview Map View */}
      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: LEAFLET_HTML }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

      {/* Stats Bar */}
      {stats && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            <Text style={styles.statsValue}>{stats.total_complaints_today || 0}</Text> today
          </Text>
          <Text style={styles.statsDivider}>|</Text>
          <Text style={styles.statsText}>
            <Text style={styles.statsValue}>{stats.resolution_rate_percent || 0}%</Text> resolved
          </Text>
          <Text style={styles.statsDivider}>|</Text>
          <Text style={styles.statsText}>
            Top: <Text style={styles.statsValue}>{stats.most_common_type || 'N/A'}</Text>
          </Text>
        </View>
      )}

      {/* Floating Map Mode Selector */}
      <View style={styles.floatingToggleContainer}>
        <TouchableOpacity
          style={[styles.floatingToggleBtn, mapMode === 'station' ? styles.floatingToggleBtnActive : null]}
          onPress={() => handleMapModeChange('station')}
          activeOpacity={0.75}
        >
          <Text style={[styles.floatingToggleText, mapMode === 'station' ? styles.floatingToggleTextActive : null]}>
            🏢 Stations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.floatingToggleBtn, mapMode === 'train' ? styles.floatingToggleBtnActive : null]}
          onPress={() => handleMapModeChange('train')}
          activeOpacity={0.75}
        >
          <Text style={[styles.floatingToggleText, mapMode === 'train' ? styles.floatingToggleTextActive : null]}>
            🚆 Train Routes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Commented out Google Map code per request:
      {!loading && !error && (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: 20.5937,
            longitude: 78.9629,
            latitudeDelta: 15,
            longitudeDelta: 15,
          }}
          onPress={handleMapPress}
        >
          {stations
            .filter((s) => s.lat && s.lng && s.total_complaints > 0)
            .map((station) => {
              const lat = Number(station.lat);
              const lng = Number(station.lng);
              const colors = getCircleColors(station.total_complaints);
              const radius = Math.min(Math.max(15000, station.total_complaints * 3000), 80000);

              return (
                <React.Fragment key={station.station_code}>
                  <Circle
                    center={{ latitude: lat, longitude: lng }}
                    radius={radius}
                    fillColor={colors.fill}
                    strokeColor={colors.stroke}
                    strokeWidth={1.5}
                  />
                  <Marker
                    coordinate={{ latitude: lat, longitude: lng }}
                    onPress={() => setSelectedStation(station)}
                    tracksViewChanges={false}
                  >
                    <StationMarker station={station} />
                  </Marker>
                </React.Fragment>
              );
            })}
        </MapView>
      )}
      */}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.overlayContainer}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.brandOrange || '#E8621A'} />
            <Text style={styles.loadingText}>Loading map details...</Text>
          </View>
        </View>
      )}

      {/* Error State Overlay */}
      {error && !loading && (
        <View style={styles.overlayContainer}>
          <View style={styles.errorCard}>
            <AlertTriangle size={36} color="#CC0000" style={styles.errorIcon} />
            <Text style={styles.errorTitle}>Failed to Load Map</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMapAndStatsData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty State Overlay */}
      {!loading && !error && ((mapMode === 'station' && stations.length === 0) || (mapMode === 'train' && trains.length === 0)) && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>No complaint data available yet.</Text>
        </View>
      )}

      {/* Selected Station Bottom Sheet */}
      {selectedStation && (
        <View style={styles.bottomSheetContainer}>
          <StationBottomSheet station={selectedStation} onClose={() => setSelectedStation(null)} />
        </View>
      )}

      {/* Selected Train Bottom Sheet */}
      {selectedTrain && (
        <View style={styles.bottomSheetContainer}>
          <TrainBottomSheet train={selectedTrain} onClose={() => setSelectedTrain(null)} />
        </View>
      )}
    </View>
  );
}

// Train details Bottom Sheet
function TrainBottomSheet({ train, onClose }) {
  if (!train) return null;

  // Get top 3 categories
  const sortedTypes = Object.entries(train.breakdown || {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <View style={styles.bottomSheetCard}>
      <View style={styles.bottomSheetHeader}>
        <View>
          <Text style={styles.stationTitle}>Train {train.train_number}</Text>
          <Text style={styles.stationSubtitle}>{train.train_name}</Text>
        </View>
        {onClose && (
          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.75} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.totalComplaints}>
        {train.total_complaints} {train.total_complaints === 1 ? 'Complaint' : 'Complaints'} Total
      </Text>

      {/* Breakdown categories */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Top Issues</Text>
        {sortedTypes.length > 0 ? (
          sortedTypes.map((item, idx) => (
            <View key={item.type || idx} style={styles.breakdownRow}>
              <Text style={styles.breakdownType}>{item.type}</Text>
              <Text style={styles.breakdownCount}>{item.count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No issue breakdown available.</Text>
        )}
      </View>

      {/* Affected Coaches */}
      {train.coaches && Object.keys(train.coaches).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Affected Coaches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coachesScroll}>
            {Object.entries(train.coaches)
              .sort((a, b) => b[1] - a[1])
              .map(([coach, count]) => (
                <View key={coach} style={styles.coachCard}>
                  <Text style={styles.coachName}>{coach}</Text>
                  <Text style={styles.coachCount}>{count} {count === 1 ? 'case' : 'cases'}</Text>
                </View>
              ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsText: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '500',
  },
  statsValue: {
    color: COLORS.brandOrange || '#E8621A',
    fontWeight: '700',
  },
  statsDivider: {
    color: COLORS.dividerGrey || '#E0E0E0',
    marginHorizontal: 12,
    fontSize: 12,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingToggleContainer: {
    position: 'absolute',
    top: 60, // floating just below the statsBar
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 12,
  },
  floatingToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  floatingToggleBtnActive: {
    backgroundColor: COLORS.brandNavy || '#1A3557',
  },
  floatingToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
  },
  floatingToggleTextActive: {
    color: '#FFFFFF',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary || '#555555',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CC0000',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: COLORS.brandOrange || '#E8621A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
  },
  stationSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary || '#555555',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.textSecondary || '#555555',
    fontWeight: '700',
  },
  totalComplaints: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandOrange || '#E8621A',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary || '#555555',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dividerGrey || '#E0E0E0',
  },
  breakdownType: {
    fontSize: 14,
    color: COLORS.textPrimary || '#111111',
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary || '#555555',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
    fontStyle: 'italic',
  },
  coachesScroll: {
    paddingVertical: 4,
  },
  coachCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  coachName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandNavy || '#1A3557',
  },
  coachCount: {
    fontSize: 10,
    color: '#555555',
    marginTop: 2,
  },
});
