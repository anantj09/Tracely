import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTracely } from '../../context/TracelyContext';
import { COLORS } from '../../constants';
import apiClient from '../../services/apiClient';

export default function ProfileSetupScreen() {
  const { token, login } = useTracely();
  const [name, setName] = useState('');
  const [emergencyContact1, setEmergencyContact1] = useState('');
  const [emergencyContact2, setEmergencyContact2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCompleteProfile = async () => {
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setError('');
    setLoading(true);

    const emergency_contacts = [];
    if (emergencyContact1.trim()) {
      if (emergencyContact1.trim().length !== 10 || isNaN(emergencyContact1)) {
        setError('Emergency contact 1 must be a valid 10-digit number.');
        setLoading(false);
        return;
      }
      emergency_contacts.push(emergencyContact1.trim());
    }
    if (emergencyContact2.trim()) {
      if (emergencyContact2.trim().length !== 10 || isNaN(emergencyContact2)) {
        setError('Emergency contact 2 must be a valid 10-digit number.');
        setLoading(false);
        return;
      }
      emergency_contacts.push(emergencyContact2.trim());
    }

    try {
      // Direct post to profile endpoint. Headers are handled by setting token explicitly
      // in apiClient interceptor or temporarily since we haven't stored it yet
      const headers = { Authorization: `Bearer ${token}` };
      const response = await apiClient.post('/auth/complete-profile', {
        name,
        emergency_contacts
      }, { headers });

      const { data } = response.data;
      if (data && data.user) {
        // Complete login
        await login(token, data.user);
      }
    } catch (err) {
      console.warn('Complete profile failed:', err.message);
      const isNetErr = err.code === 'ECONNABORTED' || !err.response;
      setError(isNetErr ? 'Could not connect. Check your connection.' : 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Complete Profile</Text>
      <Text style={styles.subheading}>Let railway authorities know your details for alerts and emergency safety assistance</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Raj Kumar"
          placeholderTextColor={COLORS.placeholderText}
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (error) setError('');
          }}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Emergency Contact 1 (Optional)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          maxLength={10}
          placeholder="10-digit phone number"
          placeholderTextColor={COLORS.placeholderText}
          value={emergencyContact1}
          onChangeText={(val) => {
            setEmergencyContact1(val);
            if (error) setError('');
          }}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Emergency Contact 2 (Optional)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          maxLength={10}
          placeholder="10-digit phone number"
          placeholderTextColor={COLORS.placeholderText}
          value={emergencyContact2}
          onChangeText={(val) => {
            setEmergencyContact2(val);
            if (error) setError('');
          }}
        />
      </View>

      {error ? (
        <View style={{ width: '100%', marginBottom: 16 }}>
          <Text style={styles.errorText}>{error}</Text>
          {error === 'Could not connect. Check your connection.' && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleCompleteProfile}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.button}
        disabled={loading}
        activeOpacity={0.75}
        onPress={handleCompleteProfile}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.dividerGrey,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  retryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.brandOrange,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 4,
  },
  retryBtnText: {
    color: COLORS.brandOrange,
    fontSize: 15,
    fontWeight: '700',
  },
});
