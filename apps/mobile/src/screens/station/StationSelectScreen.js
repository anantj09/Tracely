import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { getStationData } from './services/stationService';

const STATIONS = [
  { code:'CSTM', name:'Mumbai CST', city:'Mumbai', icon:'🚂' },
  { code:'NDLS', name:'New Delhi', city:'New Delhi', icon:'🏛️' },
  { code:'ADI', name:'Ahmedabad Junction', city:'Ahmedabad', icon:'🔷' },
  { code:'SBC', name:'Bengaluru City', city:'Bengaluru', icon:'🌳' },
];

export default function StationSelectScreen({ navigation }) {
  const [loadingCode, setLoadingCode] = useState(null);

  const handleSelect = async (station) => {
    setLoadingCode(station.code);
    try {
      const data = await getStationData(station.code);
      navigation.navigate('StationSchematic', {
        stationCode: station.code,
        stationName: station.name,
        amenities: data.amenities || [],
        vendors: data.vendors || []
      });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load station data');
    } finally {
      setLoadingCode(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {STATIONS.map((st) => (
        <TouchableOpacity
          key={st.code}
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => handleSelect(st)}
          disabled={loadingCode !== null}
        >
          <Text style={styles.icon}>{st.icon}</Text>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{st.name}</Text>
            <Text style={styles.city}>{st.city}</Text>
          </View>
          {loadingCode === st.code ? (
            <ActivityIndicator color="#E8621A" />
          ) : (
            <Text style={styles.chevron}>›</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  icon: { fontSize: 32, marginRight: 16 },
  textContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1A3557' },
  city: { fontSize: 14, color: '#888', marginTop: 4 },
  chevron: { fontSize: 24, color: '#E8621A', paddingHorizontal: 8 }
});
