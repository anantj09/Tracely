import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { declareIntent } from './services/stationService';

const CrowdingGauge = ({ score, label }) => {
  const scaleAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.spring(scaleAnim, { 
      toValue: 1, 
      tension: 50, 
      friction: 7,
      useNativeDriver: true 
    }).start();
  }, [scaleAnim]);

  let bgColor = '#27AE60';
  if (score >= 7) bgColor = '#CC0000';
  else if (score >= 4) bgColor = '#F5A623';

  let labelText = 'Likely Comfortable';
  if (label === 'VERY_CROWDED' || label === 'VERY HIGH') labelText = 'Very Crowded — Plan Ahead';
  else if (label === 'MODERATE' || label === 'HIGH') labelText = 'Moderate Crowding Expected';

  return (
    <View style={styles.gaugeContainer}>
      <Animated.View style={[styles.circle, { backgroundColor: bgColor, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.scoreText}>{score ? score.toFixed(1) : 'N/A'}</Text>
        <Text style={styles.maxText}>/10</Text>
      </Animated.View>
      <Text style={styles.gaugeLabel}>{labelText}</Text>
    </View>
  );
};

export default function CrowdingResultScreen({ route, navigation }) {
  const { result, payload } = route.params;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleConfirmIntent = async () => {
    if (!payload) {
      Alert.alert('Error', 'Input details missing. Please try planning again.');
      return;
    }
    setLoading(true);
    try {
      await declareIntent(payload);
      setSuccess(true);
      Alert.alert(
        'Intent Confirmed',
        'Your travel intent has been registered! This will help optimize services and predict crowding.',
        [{ text: 'OK', onPress: () => navigation.navigate('StationHome') }]
      );
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to submit intent';
      if (err.response?.status === 409 || errMsg.includes('already declared')) {
        setSuccess(true);
        Alert.alert(
          'Already Confirmed',
          'You have already declared a travel intent for this route and date.',
          [{ text: 'OK', onPress: () => navigation.navigate('StationHome') }]
        );
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CrowdingGauge score={result.crowding_score} label={result.crowding_label} />

      <View style={styles.card}>
        <Text style={styles.routeText}>{result.from_station} → {result.to_station}</Text>
        <Text style={styles.detailText}>Date: {result.travel_date}</Text>
        <Text style={styles.detailText}>Class: GEN</Text>
      </View>

      {result.is_surge_route && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠️ High Demand Alert</Text>
          <Text style={styles.alertBody}>This route is heavily booked. Consider an alternate train.</Text>
          {result.alternate_trains && result.alternate_trains.map((train, index) => (
            <View key={index} style={styles.trainRow}>
              <Text style={styles.trainName}>{train.train_number} - {train.name}</Text>
              <View style={styles.smallBadge}>
                <Text style={styles.smallBadgeText}>{train.score}/10</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.buttons}>
        {success ? (
          <View style={styles.successCard}>
            <Text style={styles.successText}>✓ Travel intent registered for this route!</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.confirmBtn} 
            activeOpacity={0.75} 
            onPress={handleConfirmIntent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.confirmBtnText}>I have travel intent for this route</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.75} onPress={() => navigation.navigate('StationHome')}>
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.75} onPress={() => navigation.navigate('IntentForm')}>
          <Text style={styles.secondaryBtnText}>Plan Another Journey</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, alignItems: 'center' },
  gaugeContainer: { alignItems: 'center', marginVertical: 32 },
  circle: { width: 200, height: 200, borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 56, fontWeight: '700', color: '#FFF' },
  maxText: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
  gaugeLabel: { fontSize: 18, fontWeight: '700', color: '#1A3557', textAlign: 'center', marginTop: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, elevation: 3, width: '100%', marginBottom: 16 },
  routeText: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  detailText: { fontSize: 16, color: '#666' },
  alertCard: { backgroundColor: '#FFF0E6', borderColor: '#E8621A', borderWidth: 1, borderRadius: 14, padding: 16, width: '100%', marginBottom: 24 },
  alertTitle: { fontSize: 18, fontWeight: 'bold', color: '#E8621A', marginBottom: 8 },
  alertBody: { fontSize: 14, color: '#333', marginBottom: 12 },
  trainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F5D0B5' },
  trainName: { fontSize: 14, fontWeight: '600', color: '#333' },
  smallBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  smallBadgeText: { color: '#27AE60', fontWeight: 'bold', fontSize: 12 },
  buttons: { width: '100%', gap: 12 },
  confirmBtn: { backgroundColor: '#E8621A', padding: 16, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  primaryBtn: { backgroundColor: '#1A3557', padding: 16, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#FFF', padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#1A3557' },
  secondaryBtnText: { color: '#1A3557', fontSize: 16, fontWeight: '700' },
  successCard: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#27AE60' },
  successText: { color: '#27AE60', fontWeight: 'bold', fontSize: 16 }
});
