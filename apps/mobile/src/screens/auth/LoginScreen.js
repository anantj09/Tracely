import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SCREENS } from '../../constants';
import { supabase } from '../../services/supabaseClient';
import { useTracely } from '../../context/TracelyContext';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useTracely();

  const handleSendOTP = async () => {
    if (phone.length !== 10 || isNaN(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const isDemoPhone = phone === '9999999999' || phone === '1234567890';
      if (isDemoPhone) {
        setLoading(false);
        navigation.navigate(SCREENS.OTP_VERIFY, { phone });
        return;
      }

      const formattedPhone = `+91${phone}`;

      // Supabase sends OTP via SMS (or uses test OTP if phone is in test list)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send OTP. Please try again.');
        return;
      }

      // OTP sent — navigate to verification screen
      navigation.navigate(SCREENS.OTP_VERIFY, { phone });

    } catch (err) {
      const isNetErr = !err.response && err.message?.includes('fetch');
      setError(isNetErr
        ? 'Could not connect. Check your connection.'
        : 'Failed to send OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWZhNWI3NTAtNzZjZS00OWI0LTkxNTItMjY4MjA2ZTgwZjBjIiwicGhvbmUiOiI5OTk5OTk5OTk5IiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.JRm7oCU_rnG7qcvqYL7NdlwizhpRFZ41nPgWQdju4XQ';
      const demoUser = {
        id: 'afa5b750-76ce-49b4-9152-268206e80f0c',
        phone: '9999999999',
        name: 'Demo Passenger',
        preferred_class: 'SL',
        active_journey: {
          train_number: '12951',
          train_name: 'Mumbai Rajdhani Express',
          coach: 'B3',
          berth: '42',
          boarding_station: 'NDLS',
          destination_station: 'MMCT',
          travel_date: new Date().toISOString().split('T')[0],
        },
      };
      await login(demoToken, demoUser);
    } catch (err) {
      setError('Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoIcon}>🚆</Text>
        <Text style={styles.logoText}>
          <Text style={styles.logoTrace}>Trace</Text>
          <Text style={styles.logoLy}>ly</Text>
        </Text>
      </View>

      <Text style={headingStyle}>Enter Mobile Number</Text>
      <Text style={subheadingStyle}>
        We will send a 6-digit OTP code to verify your identity
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.countryCode}>+91</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          maxLength={10}
          placeholder="98765 43210"
          placeholderTextColor={COLORS.placeholderText}
          value={phone}
          onChangeText={(val) => { setPhone(val); if (error) setError(''); }}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        activeOpacity={0.75}
        disabled={loading}
        onPress={handleSendOTP}
      >
        {loading
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Text style={styles.buttonText}>Send OTP</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.demoButton, loading && { opacity: 0.7 }]}
        activeOpacity={0.75}
        disabled={loading}
        onPress={handleDemoLogin}
      >
        <Text style={styles.demoButtonText}>Demo Login (Skip OTP)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.registerButton, loading && { opacity: 0.7 }]}
        activeOpacity={0.75}
        disabled={loading}
        onPress={() => navigation.navigate(SCREENS.REGISTER)}
      >
        <Text style={styles.registerButtonText}>New User? Register Here</Text>
      </TouchableOpacity>

      {/* Demo hint for hackathon testing */}
      <Text style={styles.demoHint}>
        Tap Demo Login to explore the app without SMS
      </Text>
    </View>
  );
}

// Separate style definitions to avoid warnings about duplicating key styles
const headingStyle = { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 };
const subheadingStyle = { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 48, justifyContent: 'center' },
  logoIcon: { fontSize: 28, marginRight: 8 },
  logoText: { fontSize: 24, fontWeight: '700' },
  logoTrace: { color: COLORS.brandNavy },
  logoLy: { color: COLORS.brandOrange },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: COLORS.dividerGrey, borderRadius: 10, paddingHorizontal: 16,
    height: 54, marginBottom: 16,
  },
  countryCode: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '600', marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  errorText: { color: '#CC0000', fontSize: 13, marginBottom: 16, fontWeight: '500' },
  button: {
    backgroundColor: COLORS.brandOrange, borderRadius: 12, height: 54,
    alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  demoButton: {
    backgroundColor: COLORS.brandNavy, borderRadius: 12, height: 48,
    alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 12,
  },
  demoButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  registerButton: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: COLORS.brandOrange,
    borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center',
    width: '100%', marginTop: 12,
  },
  registerButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.brandOrange },
  demoHint: { fontSize: 12, color: COLORS.placeholderText, textAlign: 'center', marginTop: 16 },
});

