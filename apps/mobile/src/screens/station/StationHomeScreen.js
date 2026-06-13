import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTracely } from '../../context/TracelyContext';
import { getMyIntents } from './services/stationService';

export default function StationHomeScreen({ navigation }) {
  const { currentUser } = useTracely();
  const [recentIntents, setRecentIntents] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchIntents = async () => {
        try {
          setLoading(true);
          const response = await getMyIntents();
          if (isActive) {
            const data = response.data?.data || response.data || [];
            setRecentIntents(data.slice(-2).reverse());
          }
        } catch (error) {
          console.log(error); // silent fail
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchIntents();
      return () => { isActive = false; };
    }, [])
  );

  const getBadgeStyle = (label) => {
    switch(label) {
      case 'VERY_CROWDED': case 'VERY HIGH': return { bg: '#FFEBEE', text: '#CC0000' };
      case 'MODERATE': case 'HIGH': return { bg: '#FFF8E1', text: '#F5A623' };
      default: return { bg: '#E8F5E9', text: '#27AE60' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Station Guide</Text>
          <Text style={styles.subtitle}>Hello, {currentUser?.name || 'Passenger'}</Text>
        </View>

        <View style={styles.tiles}>
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.75}
            onPress={() => navigation.navigate('IntentForm')}
          >
            <View style={styles.tileContent}>
              <Text style={styles.emoji}>🚂</Text>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Plan My Journey</Text>
                <Text style={styles.tileSubtitle}>Get crowding prediction for your general class journey</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.75}
            onPress={() => navigation.navigate('StationSelect')}
          >
            <View style={styles.tileContent}>
              <Text style={styles.emoji}>🗺️</Text>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Find at Station</Text>
                <Text style={styles.tileSubtitle}>Discover amenities and vendors at major stations</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.75}
            onPress={() => navigation.navigate('CheckIn')}
          >
            <View style={styles.tileContent}>
              <Text style={styles.emoji}>📍</Text>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Check In</Text>
                <Text style={styles.tileSubtitle}>GPS check-in for crowding signal</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>My Recent Journey Plans</Text>
          {loading ? (
            <ActivityIndicator color="#E8621A" />
          ) : recentIntents.length === 0 ? (
            <Text style={styles.emptyText}>No journey plans yet</Text>
          ) : (
            recentIntents.map(intent => {
              const badge = getBadgeStyle(intent.crowding_label);
              return (
                <View key={intent.id} style={styles.recentCard}>
                  <View>
                    <Text style={styles.routeText}>{intent.from_station} → {intent.to_station}</Text>
                    <Text style={styles.dateText}>{intent.travel_date}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{intent.crowding_label || 'COMFORTABLE'}</Text>
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A3557' },
  subtitle: { fontSize: 14, color: '#555555', marginTop: 4 },
  tiles: { gap: 16, marginBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  tileContent: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 32, marginRight: 16 },
  tileText: { flex: 1 },
  tileTitle: { fontSize: 16, fontWeight: '600', color: '#1A3557', marginBottom: 4 },
  tileSubtitle: { fontSize: 13, color: '#555555' },
  arrow: { fontSize: 24, color: '#E8621A', marginLeft: 8 },
  recentSection: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A3557', marginBottom: 16 },
  emptyText: { color: '#888888', fontStyle: 'italic' },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  routeText: { fontSize: 16, fontWeight: '600', color: '#333' },
  dateText: { fontSize: 13, color: '#666', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' }
});
