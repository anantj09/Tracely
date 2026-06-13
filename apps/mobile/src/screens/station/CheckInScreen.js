/* Note: expo-location may need installation:
   npx expo install expo-location */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { checkIn } from './services/stationService';

const STATIONS = [
  { code:'CSTM', name:'Mumbai CST', icon:'🚂' },
  { code:'NDLS', name:'New Delhi', icon:'🏛️' },
  { code:'ADI', name:'Ahmedabad Junction', icon:'🔷' },
  { code:'SBC', name:'Bengaluru City', icon:'🌳' },
];

export default function CheckInScreen() {
  const [selectedStation, setSelectedStation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | loading | success | error
  const [userCoords, setUserCoords] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleGetLocation = async () => {
    setGpsStatus('loading');
    setErrorMsg(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission required for check-in');
        setGpsStatus('error');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserCoords(location.coords);
      setGpsStatus('success');
    } catch (_err) {
      setErrorMsg('Failed to get location. Please try again.');
      setGpsStatus('error');
    }
  };

  const handleCheckIn = async () => {
    if (!selectedStation || !userCoords) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setCheckInResult(null);

    try {
      const response = await checkIn({ 
        station_code: selectedStation, 
        lat: userCoords.latitude, 
        lng: userCoords.longitude 
      });
      setCheckInResult(response.data?.data || response.data || response);
    } catch (err) {
      const apiErr = err.response?.data;
      if (err.response && err.response.status === 400 && apiErr?.code === 'NOT_AT_STATION') {
        setErrorMsg(`You appear to be ${apiErr.distance_metres}m away from the station. You must be within 500m to check in.`);
      } else {
        setErrorMsg(apiErr?.error || err.message || 'Failed to check in');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Check In to Station</Text>
        
        <Text style={styles.label}>Select Station</Text>
        <View style={styles.grid}>
          {STATIONS.map((st) => (
            <TouchableOpacity 
              key={st.code} 
              style={[styles.stationCard, selectedStation === st.code && styles.stationCardActive]}
              onPress={() => setSelectedStation(st.code)}
              activeOpacity={0.75}
            >
              <Text style={styles.stationIcon}>{st.icon}</Text>
              <Text style={styles.stationName}>{st.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.gpsBtn} 
          onPress={handleGetLocation} 
          activeOpacity={0.75}
        >
          <Text style={styles.gpsBtnText}>📍 Get My Location</Text>
        </TouchableOpacity>

        {gpsStatus === 'loading' && (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#E8621A" size="small" />
            <Text style={styles.statusText}>Getting your location...</Text>
          </View>
        )}
        {gpsStatus === 'success' && userCoords && (
          <Text style={styles.successText}>✓ Location obtained ({userCoords.latitude.toFixed(4)}, {userCoords.longitude.toFixed(4)})</Text>
        )}

        {errorMsg && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {checkInResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>✓ Checked in to {selectedStation}</Text>
            <Text style={styles.resultBody}>Active users here: {checkInResult.active_count || 0}</Text>
            {checkInResult.is_crowded ? (
              <View style={[styles.badge, { backgroundColor: '#FFEBEE' }]}>
                <Text style={[styles.badgeText, { color: '#CC0000' }]}>CROWDED</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.badgeText, { color: '#27AE60' }]}>Not Crowded</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.submitBtn, (!selectedStation || !userCoords) && styles.disabledBtn]} 
          activeOpacity={0.75}
          onPress={handleCheckIn}
          disabled={!selectedStation || !userCoords || isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Check In</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A3557', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  stationCard: { width: '48%', backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', elevation: 2 },
  stationCardActive: { borderColor: '#E8621A', backgroundColor: '#FFF0E6' },
  stationIcon: { fontSize: 32, marginBottom: 8 },
  stationName: { fontSize: 14, fontWeight: '600', color: '#1A3557', textAlign: 'center' },
  gpsBtn: { backgroundColor: '#E0E0E0', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  gpsBtnText: { color: '#333', fontSize: 16, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusText: { marginLeft: 8, color: '#666', fontSize: 14 },
  successText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  errorCard: { backgroundColor: '#FFF0E6', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E8621A', marginBottom: 16 },
  errorText: { color: '#E8621A', fontSize: 14, textAlign: 'center' },
  resultCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 24, elevation: 3 },
  resultTitle: { fontSize: 18, fontWeight: '700', color: '#27AE60', marginBottom: 8 },
  resultBody: { fontSize: 16, color: '#555', marginBottom: 16 },
  badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  badgeText: { fontWeight: 'bold', fontSize: 14 },
  submitBtn: { backgroundColor: '#E8621A', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  disabledBtn: { backgroundColor: '#FFC8B3' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
