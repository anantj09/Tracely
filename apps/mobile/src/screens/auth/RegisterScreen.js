import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert as AlertNative,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTracely } from '../../context/TracelyContext';
import { COLORS, SCREENS } from '../../constants';
import { supabase } from '../../services/supabaseClient';
import apiClient from '../../services/apiClient';

const Alert = {
  alert: (title, message, buttons) => {
    if (Platform.OS === 'web') {
      const formattedMessage = title ? `${title}\n\n${message}` : message;
      window.alert(formattedMessage);
      if (buttons && buttons.length > 0) {
        const primaryButton = buttons.find(b => b.text === 'OK' || b.text === 'Yes') || buttons[0];
        if (primaryButton && typeof primaryButton.onPress === 'function') {
          primaryButton.onPress();
        }
      }
    } else {
      AlertNative.alert(title, message, buttons);
    }
  }
};

export default function RegisterScreen({ navigation }) {
  const { login } = useTracely();

  // Registration Form States
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [emergencyContact1, setEmergencyContact1] = useState('');
  const [emergencyContact2, setEmergencyContact2] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('M');

  // Flow control states
  const [step, setStep] = useState(1); // 1: Details Form, 2: OTP Verify, 3: Success Screen
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Results state
  const [generatedUserId, setGeneratedUserId] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [savedUser, setSavedUser] = useState('');

  // Stage 1: Validate fields and send OTP
  const handleSendOTP = async () => {
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (phone.length !== 10 || isNaN(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const ageVal = parseInt(age, 10);
    if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
      setError('Please enter a valid age between 1 and 120.');
      return;
    }

    if (emergencyContact1.trim()) {
      if (emergencyContact1.trim().length !== 10 || isNaN(emergencyContact1)) {
        setError('Emergency contact 1 must be a valid 10-digit number.');
        return;
      }
    }
    if (emergencyContact2.trim()) {
      if (emergencyContact2.trim().length !== 10 || isNaN(emergencyContact2)) {
        setError('Emergency contact 2 must be a valid 10-digit number.');
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      const isDemoPhone = phone === '9999999999' || phone === '1234567890';
      if (isDemoPhone) {
        setLoading(false);
        setStep(2);
        return;
      }

      const formattedPhone = `+91${phone}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (otpError) {
        setError(otpError.message || 'Failed to send OTP. Please try again.');
        return;
      }

      setStep(2);
    } catch (err) {
      setError('Could not initiate OTP. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Verify OTP code and create profile
  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6 || isNaN(otpCode)) {
      setError('Please enter a 6-digit verification code.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const isDemoPhone = phone === '9999999999' || phone === '1234567890';
      let accessToken;

      if (isDemoPhone) {
        if (phone === '9999999999' && otpCode === '123456') {
          accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWZhNWI3NTAtNzZjZS00OWI0LTkxNTItMjY4MjA2ZTgwZjBjIiwicGhvbmUiOiI5OTk5OTk5OTk5IiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.JRm7oCU_rnG7qcvqYL7NdlwizhpRFZ41nPgWQdju4XQ';
        } else if (phone === '1234567890' && otpCode === '999999') {
          accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci1kZW1vLWlkLTEyMzQ1IiwicGhvbmUiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.mockSignature';
        } else {
          setError('Invalid verification code for demo login.');
          setLoading(false);
          return;
        }
      } else {
        const formattedPhone = `+91${phone}`;
        const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otpCode,
          type: 'sms',
        });

        if (verifyError || !sessionData?.session) {
          setError(verifyError?.message || 'Invalid verification code.');
          setLoading(false);
          return;
        }

        accessToken = sessionData.session.access_token;
      }

      // Step 2a: Send token to verify-otp endpoint to register user record
      const response = await apiClient.post('/auth/verify-otp', {
        phone,
        access_token: accessToken,
      });

      const { data } = response.data;
      if (!data || !data.user) {
        throw new Error('Failed to register user account record');
      }

      // Step 2b: Complete profile details (name, contacts, age, gender)
      const emergency_contacts = [];
      if (emergencyContact1.trim()) emergency_contacts.push(emergencyContact1.trim());
      if (emergencyContact2.trim()) emergency_contacts.push(emergencyContact2.trim());

      const profileResponse = await apiClient.patch('/users/me', {
        name: name.trim(),
        emergency_contacts,
        age: parseInt(age, 10),
        gender
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const updatedUser = profileResponse.data?.data;
      if (!updatedUser) {
        throw new Error('Failed to save profile details');
      }

      // Save credentials for stage 3 login trigger
      setGeneratedUserId(updatedUser.id);
      setSavedToken(accessToken);
      setSavedUser(updatedUser);
      setStep(3);

    } catch (err) {
      console.warn('Registration process failed:', err.message);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = async () => {
    if (generatedUserId) {
      await Clipboard.setStringAsync(generatedUserId);
      Alert.alert('Copied', 'User ID copied to clipboard.');
    }
  };

  const handleEnterApp = async () => {
    setLoading(true);
    try {
      if (savedToken && savedUser) {
        await login(savedToken, savedUser);
      } else {
        navigation.navigate(SCREENS.LOGIN);
      }
    } catch (err) {
      console.warn('Final entry login failed:', err.message);
      navigation.navigate(SCREENS.LOGIN);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {step === 1 && (
        <View style={styles.formWrapper}>
          <Text style={styles.heading}>Register Account</Text>
          <Text style={styles.subheading}>Create an account to verify details and obtain your unique Tatkal booking User ID</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Raj Kumar"
              placeholderTextColor={COLORS.placeholderText}
              value={name}
              onChangeText={(val) => { setName(val); if (error) setError(''); }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <View style={styles.phoneWrapper}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
                maxLength={10}
                placeholder="10-digit number"
                placeholderTextColor={COLORS.placeholderText}
                value={phone}
                onChangeText={(val) => { setPhone(val); if (error) setError(''); }}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                maxLength={3}
                placeholder="Age"
                placeholderTextColor={COLORS.placeholderText}
                value={age}
                onChangeText={(val) => { setAge(val); if (error) setError(''); }}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Gender *</Text>
              <View style={styles.genderContainer}>
                {['M', 'F', 'O'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderOption,
                      gender === g ? styles.genderOptionActive : null,
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        gender === g ? styles.genderOptionTextActive : null,
                      ]}
                    >
                      {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
              onChangeText={(val) => { setEmergencyContact1(val); if (error) setError(''); }}
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
              onChangeText={(val) => { setEmergencyContact2(val); if (error) setError(''); }}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
            activeOpacity={0.75}
            onPress={handleSendOTP}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Register & Send OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate(SCREENS.LOGIN)}
          >
            <Text style={styles.backBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.formWrapper}>
          <Text style={styles.heading}>Verify Phone</Text>
          <Text style={styles.subheading}>Enter the 6-digit OTP code sent to +91 {phone}</Text>

          <TextInput
            style={styles.otpInput}
            keyboardType="numeric"
            maxLength={6}
            placeholder="123456"
            placeholderTextColor={COLORS.placeholderText}
            value={otpCode}
            onChangeText={(val) => { setOtpCode(val); if (error) setError(''); }}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
            activeOpacity={0.75}
            onPress={handleVerifyOTP}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP & Complete</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(1)}
          >
            <Text style={styles.backBtnText}>Change Details / Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View style={styles.successWrapper}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successHeading}>Registration Successful!</Text>
          <Text style={styles.successSub}>
            Your profile is verified. Below is your unique Tracely passenger ID. Save/copy this ID to book Tatkal tickets.
          </Text>

          <View style={styles.idCard}>
            <Text style={styles.idLabel}>YOUR UNIQUE USER ID</Text>
            <Text style={styles.idValue}>{generatedUserId}</Text>
          </View>

          <TouchableOpacity
            style={styles.copyBtn}
            onPress={handleCopyId}
            activeOpacity={0.75}
          >
            <Text style={styles.copyBtnText}>📋 Copy User ID</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleEnterApp}
            activeOpacity={0.75}
          >
            <Text style={styles.buttonText}>Login & Proceed to App</Text>
          </TouchableOpacity>
        </View>
      )}
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
  formWrapper: {
    width: '100%',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.brandNavy,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 18,
    textAlign: 'center',
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
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  phoneWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 10,
    paddingLeft: 16,
    height: 50,
  },
  countryCode: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginRight: 10,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  genderContainer: {
    flexDirection: 'row',
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 10,
    overflow: 'hidden',
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  genderOptionActive: {
    backgroundColor: COLORS.brandOrange,
  },
  genderOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  genderOptionTextActive: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    color: COLORS.brandOrange,
    fontSize: 14,
    fontWeight: '600',
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 16,
  },
  successWrapper: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#27AE60',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  idCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  idLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  idValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandNavy,
    textAlign: 'center',
  },
  copyBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.brandOrange,
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  copyBtnText: {
    color: COLORS.brandOrange,
    fontSize: 14,
    fontWeight: '700',
  },
});
