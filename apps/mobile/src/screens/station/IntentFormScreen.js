import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { predictIntent } from './services/stationService';

export default function IntentFormScreen({ navigation }) {
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [train, setTrain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!fromStation || !toStation) {
      setError('Please fill in both origin and destination.');
      return;
    }
    if (fromStation.toUpperCase() === toStation.toUpperCase()) {
      setError('Origin and destination cannot be the same.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload = {
        from_station: fromStation.toUpperCase(),
        to_station: toStation.toUpperCase(),
        travel_date: date.toISOString().split('T')[0],
        preferred_train: train,
        class: 'GEN'
      };
      const response = await predictIntent(payload);
      navigation.navigate('CrowdingResult', { result: response.data.data, payload });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit intent');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>From Station</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. NDLS for New Delhi"
          autoCapitalize="characters"
          maxLength={7}
          value={fromStation}
          onChangeText={setFromStation}
        />
        <Text style={styles.hint}>Station codes: NDLS, MMCT, ADI, SBC, CSTM</Text>

        <Text style={styles.label}>To Station</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. MMCT"
          autoCapitalize="characters"
          maxLength={7}
          value={toStation}
          onChangeText={setToStation}
        />

        <Text style={styles.label}>Travel Date</Text>
        <TouchableOpacity style={styles.dateBtn} activeOpacity={0.75} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>{date.toDateString()}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        <Text style={styles.label}>Preferred Train</Text>
        <TextInput
          style={styles.input}
          placeholder="Train number (optional)"
          keyboardType="numeric"
          value={train}
          onChangeText={setTrain}
        />

        <Text style={styles.label}>Travel Class</Text>
        <View style={styles.lockedInput}>
          <Text style={styles.lockedText}>GEN (General)</Text>
        </View>
        <Text style={styles.hint}>Unreserved general class only</Text>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.submitBtn} 
          activeOpacity={0.75}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Get Crowding Prediction</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, elevation: 3 },
  label: { fontSize: 14, fontWeight: '600', color: '#1A3557', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16 },
  lockedInput: { backgroundColor: '#E0E0E0', borderRadius: 8, padding: 12 },
  lockedText: { color: '#555', fontSize: 16 },
  hint: { fontSize: 12, color: '#888', marginTop: 4 },
  dateBtn: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: '#FFF' },
  dateText: { fontSize: 16, color: '#333' },
  errorCard: { marginTop: 16, padding: 12, borderWidth: 1, borderColor: '#E8621A', borderRadius: 8, backgroundColor: '#FFF0E6' },
  errorText: { color: '#E8621A', fontSize: 14 },
  submitBtn: { backgroundColor: '#E8621A', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
