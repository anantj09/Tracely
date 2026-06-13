import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { reportHawker } from './services/stationService';

export default function ReportHawkerScreen({ route, navigation }) {
  const [stationCode, setStationCode] = useState(route.params?.stationCode || '');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const STATIONS = ['NDLS', 'CSTM', 'ADI', 'SBC'];

  const handleSubmit = async () => {
    if (!stationCode) {
      setError('Please select a station');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await reportHawker({ station_code: stationCode, location_description: description });
      Alert.alert('Report Submitted', 'Station managers will investigate and take action.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Report an unlicensed vendor to station management</Text>
        <Text style={styles.infoSubtitle}>Station managers will investigate and take action</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Station Code</Text>
        {route.params?.stationCode ? (
          <View style={styles.lockedInput}>
            <Text style={styles.lockedText}>{stationCode}</Text>
          </View>
        ) : (
          <View style={styles.pickerRow}>
            {STATIONS.map(code => (
              <TouchableOpacity 
                key={code} 
                style={[styles.pickerBtn, stationCode === code && styles.pickerBtnActive]}
                onPress={() => setStationCode(code)}
              >
                <Text style={[styles.pickerBtnText, stationCode === code && styles.pickerBtnTextActive]}>{code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>Description (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe the vendor or their location (optional)"
          maxLength={200}
          multiline={true}
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{description.length}/200</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity 
          style={styles.submitBtn} 
          activeOpacity={0.75}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Report</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  infoCard: { backgroundColor: '#E1F5FE', padding: 16, borderRadius: 14, marginBottom: 16 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#0277BD', marginBottom: 4 },
  infoSubtitle: { fontSize: 14, color: '#01579B' },
  formCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, elevation: 3 },
  label: { fontSize: 14, fontWeight: '600', color: '#1A3557', marginBottom: 8 },
  lockedInput: { backgroundColor: '#E0E0E0', borderRadius: 8, padding: 12 },
  lockedText: { color: '#555', fontSize: 16, fontWeight: '600' },
  pickerRow: { flexDirection: 'row', gap: 8 },
  pickerBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, alignItems: 'center' },
  pickerBtnActive: { backgroundColor: '#1A3557', borderColor: '#1A3557' },
  pickerBtnText: { color: '#333', fontSize: 14, fontWeight: '600' },
  pickerBtnTextActive: { color: '#FFF' },
  input: { width: '100%', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16, height: 100 },
  counter: { alignSelf: 'flex-end', fontSize: 12, color: '#888', marginTop: 4, marginBottom: 16 },
  errorText: { color: '#E8621A', marginBottom: 16 },
  submitBtn: { backgroundColor: '#E8621A', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
