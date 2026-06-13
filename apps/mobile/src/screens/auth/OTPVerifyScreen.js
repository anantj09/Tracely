import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { useTracely } from '../../context/TracelyContext';
import { COLORS } from '../../constants';
import { supabase } from '../../services/supabaseClient';
import apiClient from '../../services/apiClient';

export default function OTPVerifyScreen({ route, navigation }) {
  const { phone } = route.params || { phone: '' };
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useTracely();

  const handleVerify = async () => {
    if (code.length !== 6 || isNaN(code)) {
      setError('Please enter a 6-digit verification code.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const isDemoPhone = phone === '9999999999' || phone === '1234567890';
      let accessToken;

      if (isDemoPhone) {
        if (phone === '9999999999' && code === '123456') {
          accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWZhNWI3NTAtNzZjZS00OWI0LTkxNTItMjY4MjA2ZTgwZjBjIiwicGhvbmUiOiI5OTk5OTk5OTk5IiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.JRm7oCU_rnG7qcvqYL7NdlwizhpRFZ41nPgWQdju4XQ';
        } else if (phone === '1234567890' && code === '999999') {
          accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci1kZW1vLWlkLTEyMzQ1IiwicGhvbmUiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.mockSignature';
        } else {
          setError('Invalid verification code for demo login.');
          setLoading(false);
          return;
        }
      } else {
        const formattedPhone = `+91${phone}`;

        // Step 1: Verify OTP with Supabase directly — get a session
        const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: code,
          type: 'sms',
        });

        if (verifyError || !sessionData?.session) {
          setError(verifyError?.message || 'Invalid verification code. Please try again.');
          setLoading(false);
          return;
        }

        accessToken = sessionData.session.access_token;
      }

      // Step 2: Send access_token to our Express backend to find/create user profile
      const response = await apiClient.post('/auth/verify-otp', {
        phone,
        access_token: accessToken,
      });

      const { data } = response.data;
      if (data && data.token) {
        // Step 3: Store token and load user profile via TracelyContext
        // data.token IS the Supabase access_token (returned as-is from backend)
        await login(data.token, data.user);
        // AppNavigator handles routing based on profile completeness (name set or not)
      }

    } catch (err) {
      console.warn('OTP verify failed:', err.message);
      const isNetErr = err.code === 'ECONNABORTED' || !err.response;
      setError(isNetErr
        ? 'Could not connect. Check your connection.'
        : err.response?.data?.error || 'Verification failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // UI is IDENTICAL to the original
  return (
    <View style={styles.container}>
      <Text style={headingStyle}>Verification Code</Text>
      <Text style={subheadingStyle}>
        Enter the 6-digit code sent to +91 {phone}
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        maxLength={6}
        placeholder="123456"
        placeholderTextColor={COLORS.placeholderText}
        value={code}
        onChangeText={(val) => { setCode(val); if (error) setError(''); }}
      />

      {error ? (
        <View style={{ width: '100%', marginBottom: 16 }}>
          <Text style={styles.errorText}>{error}</Text>
          {error === 'Could not connect. Check your connection.' && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleVerify}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        disabled={loading}
        activeOpacity={0.75}
        onPress={handleVerify}
      >
        {loading
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Text style={styles.buttonText}>Verify & Proceed</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// Separate style definitions to avoid warnings about duplicating key styles
const headingStyle = { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 };
const subheadingStyle = { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 };

// Styles identical to original
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' },
  input: {
    borderWidth: 1.5, borderColor: COLORS.dividerGrey, borderRadius: 10,
    paddingHorizontal: 16, height: 54, fontSize: 20, color: COLORS.textPrimary,
    textAlign: 'center', letterSpacing: 4, marginBottom: 16,
  },
  errorText: { color: '#CC0000', fontSize: 13, marginBottom: 16, fontWeight: '500' },
  button: {
    backgroundColor: COLORS.brandOrange, borderRadius: 12, height: 54,
    alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  retryBtn: {
    borderWidth: 1.5, borderColor: COLORS.brandOrange, borderRadius: 12,
    height: 48, alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 4,
  },
  retryBtnText: { color: COLORS.brandOrange, fontSize: 15, fontWeight: '700' },
});
