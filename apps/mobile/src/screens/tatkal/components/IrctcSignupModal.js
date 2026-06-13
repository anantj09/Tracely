// apps/mobile/src/screens/tatkal/components/IrctcSignupModal.js
// Overlay modal for linking IRCTC credentials, passenger profiles, and OTP verification.
// Mounts via parent state toggle; communicates result via onSuccess/onClose callbacks.

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  User,
  Lock,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  KeyRound,
  Smartphone,
} from 'lucide-react-native';
import { linkIrctcAccount } from '../services/tatkalService';

const BRAND_ORANGE = '#E8621A';
const BRAND_NAVY = '#1A3557';

// ─── OTP Input Row ────────────────────────────────────────────────
function OtpInputRow({ length = 6, value, onChange }) {
  const refs = useRef([]);
  const [digits, setDigits] = useState(Array(length).fill(''));

  useEffect(() => {
    if (value && value.length === length) {
      setDigits(value.split(''));
    }
  }, [value, length]);

  const handleChange = (text, idx) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    if (sanitized.length > 1) return;
    const next = [...digits];
    next[idx] = sanitized;
    setDigits(next);
    onChange(next.join(''));
    if (sanitized && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={otpStyles.row}>
      {Array.from({ length }).map((_, idx) => (
        <TextInput
          key={idx}
          ref={(el) => (refs.current[idx] = el)}
          style={[
            otpStyles.cell,
            digits[idx] ? otpStyles.cellFilled : null,
          ]}
          value={digits[idx]}
          onChangeText={(t) => handleChange(t, idx)}
          onKeyPress={(e) => handleKeyPress(e, idx)}
          keyboardType="numeric"
          maxLength={1}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const otpStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  cell: {
    width: 44,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  cellFilled: {
    borderColor: BRAND_ORANGE,
    backgroundColor: '#FFF3EC',
  },
});

// ─── Main Modal Component ─────────────────────────────────────────
export default function IrctcSignupModal({ visible, onClose, onSuccess }) {
  // Stage: 'credentials' → 'passengers' → 'otp' → 'success'
  const [stage, setStage] = useState('credentials');

  // Credential fields
  const [irctcUsername, setIrctcUsername] = useState('');
  const [irctcPassword, setIrctcPassword] = useState('');

  // Passenger profiles
  const [passengers, setPassengers] = useState([
    { name: '', age: '', gender: 'M', berth_preference: 'LB' },
  ]);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('M');
  const [newBerth, setNewBerth] = useState('LB');

  // OTP state
  const [otpValue, setOtpValue] = useState('');
  const [otpTimer, setOtpTimer] = useState(30);
  const timerRef = useRef(null);

  // Loading and error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStage('credentials');
      setIrctcUsername('');
      setIrctcPassword('');
      setPassengers([{ name: '', age: '', gender: 'M', berth_preference: 'LB' }]);
      setOtpValue('');
      setOtpTimer(30);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [visible]);

  // OTP countdown timer
  useEffect(() => {
    if (stage === 'otp' && otpTimer > 0) {
      timerRef.current = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [stage, otpTimer]);

  const getFocusStyle = (field) =>
    focusedField === field ? { borderColor: BRAND_ORANGE, borderWidth: 2 } : {};

  // ── Stage 1: Validate credentials ──
  const handleCredentialsNext = () => {
    if (!irctcUsername.trim()) {
      Alert.alert('Required', 'Please enter your IRCTC username.');
      return;
    }
    if (!irctcPassword.trim() || irctcPassword.length < 4) {
      Alert.alert('Required', 'Please enter a valid IRCTC password (min 4 chars).');
      return;
    }
    setStage('passengers');
  };

  // ── Stage 2: Validate passengers ──
  const handleAddPassenger = () => {
    if (!newName.trim()) {
      Alert.alert('Required', 'Passenger name is required.');
      return;
    }
    const ageVal = parseInt(newAge, 10);
    if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
      Alert.alert('Required', 'Please enter a valid age (1-120).');
      return;
    }
    if (passengers.length >= 6) {
      Alert.alert('Limit', 'Maximum 6 passenger profiles allowed.');
      return;
    }
    setPassengers([
      ...passengers,
      { name: newName.trim(), age: ageVal, gender: newGender, berth_preference: newBerth },
    ]);
    setNewName('');
    setNewAge('');
    setNewGender('M');
    setNewBerth('LB');
  };

  const handleRemovePassenger = (idx) => {
    setPassengers(passengers.filter((_, i) => i !== idx));
  };

  const handlePassengersNext = () => {
    // Filter out empty entries
    const validPassengers = passengers.filter((p) => p.name && p.age);
    if (validPassengers.length === 0) {
      Alert.alert('Required', 'Please add at least one passenger profile.');
      return;
    }
    setPassengers(validPassengers);
    setOtpTimer(30);
    setOtpValue('');
    setStage('otp');
  };

  // ── Stage 3: OTP verification and submit ──
  const handleVerifyAndLink = async () => {
    if (otpValue.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the full 6-digit verification code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const validPassengers = passengers.filter((p) => p.name && p.age);
      const payload = {
        irctc_username: irctcUsername.trim(),
        irctc_password: irctcPassword.trim(),
        passengers: validPassengers,
      };
      const result = await linkIrctcAccount(payload);
      setStage('success');
      setTimeout(() => {
        if (onSuccess) onSuccess(result);
      }, 1500);
    } catch (err) {
      Alert.alert('Link Failed', err.error || 'Failed to link IRCTC account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = () => {
    setOtpTimer(30);
    setOtpValue('');
    Alert.alert('OTP Resent', 'A new OTP has been sent to your registered mobile number.');
  };

  // ── Render ──
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ShieldCheck color={BRAND_ORANGE} size={22} />
              <Text style={styles.headerTitle}>Link IRCTC Account</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color="#555555" size={24} />
            </TouchableOpacity>
          </View>

          {/* Stage Indicator */}
          <View style={styles.stageBar}>
            {['Credentials', 'Passengers', 'Verify'].map((label, idx) => {
              const stageIdx = ['credentials', 'passengers', 'otp'].indexOf(stage);
              const isActive = idx <= stageIdx || stage === 'success';
              return (
                <View key={label} style={styles.stageItem}>
                  <View style={[styles.stageDot, isActive ? styles.stageDotActive : styles.stageDotInactive]}>
                    {idx < stageIdx || stage === 'success'
                      ? <Check color="#FFFFFF" size={10} />
                      : <Text style={[styles.stageDotText, isActive ? styles.stageDotTextActive : null]}>{idx + 1}</Text>
                    }
                  </View>
                  <Text style={[styles.stageLabel, isActive ? styles.stageLabelActive : null]}>{label}</Text>
                </View>
              );
            })}
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* ── STAGE: CREDENTIALS ── */}
            {stage === 'credentials' && (
              <View style={styles.stageContent}>
                <Text style={styles.stageTitle}>IRCTC Login Credentials</Text>
                <Text style={styles.stageSub}>Enter your registered IRCTC account details to sync passenger profiles.</Text>

                <Text style={styles.fieldLabel}>IRCTC Username *</Text>
                <View style={styles.inputWrapper}>
                  <User color="#AAAAAA" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, getFocusStyle('username')]}
                    placeholder="e.g. arjun_irctc"
                    placeholderTextColor="#AAAAAA"
                    value={irctcUsername}
                    onChangeText={setIrctcUsername}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <Text style={styles.fieldLabel}>IRCTC Password *</Text>
                <View style={styles.inputWrapper}>
                  <Lock color="#AAAAAA" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, getFocusStyle('password')]}
                    placeholder="Enter password"
                    placeholderTextColor="#AAAAAA"
                    value={irctcPassword}
                    onChangeText={setIrctcPassword}
                    secureTextEntry
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <View style={styles.securityNote}>
                  <KeyRound color="#777777" size={14} />
                  <Text style={styles.securityNoteText}>
                    Your credentials are encrypted and stored securely. They are only used to sync your passenger profiles.
                  </Text>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleCredentialsNext}>
                  <Text style={styles.primaryBtnText}>Continue to Passengers</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STAGE: PASSENGERS ── */}
            {stage === 'passengers' && (
              <View style={styles.stageContent}>
                <Text style={styles.stageTitle}>Passenger Profiles</Text>
                <Text style={styles.stageSub}>Add frequent travellers for quick prefill during booking.</Text>

                {/* Existing passenger list */}
                {passengers.filter(p => p.name).map((p, idx) => (
                  <View key={idx} style={styles.passengerCard}>
                    <View style={styles.passengerInfo}>
                      <User color={BRAND_ORANGE} size={16} />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.passengerName}>{p.name}</Text>
                        <Text style={styles.passengerSub}>
                          {p.age} yrs | {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'} | {p.berth_preference}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleRemovePassenger(idx)}>
                      <Trash2 color="#CC0000" size={16} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add passenger form */}
                {passengers.length < 6 && (
                  <View style={styles.addForm}>
                    <Text style={styles.addFormTitle}>Add Passenger</Text>
                    <TextInput
                      style={[styles.formInput, getFocusStyle('pName')]}
                      placeholder="Full Name (as in ID)"
                      placeholderTextColor="#AAAAAA"
                      value={newName}
                      onChangeText={setNewName}
                      onFocus={() => setFocusedField('pName')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={[styles.formInput, getFocusStyle('pAge')]}
                      placeholder="Age"
                      placeholderTextColor="#AAAAAA"
                      keyboardType="numeric"
                      value={newAge}
                      onChangeText={setNewAge}
                      maxLength={3}
                      onFocus={() => setFocusedField('pAge')}
                      onBlur={() => setFocusedField(null)}
                    />

                    <View style={styles.chipRow}>
                      {['M', 'F', 'O'].map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.chip, newGender === g ? styles.chipActive : null]}
                          onPress={() => setNewGender(g)}
                        >
                          <Text style={[styles.chipText, newGender === g ? styles.chipTextActive : null]}>
                            {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.chipRow}>
                      {['LB', 'MB', 'UB', 'SL', 'SU', 'ND'].map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.chipSmall, newBerth === b ? styles.chipActive : null]}
                          onPress={() => setNewBerth(b)}
                        >
                          <Text style={[styles.chipSmallText, newBerth === b ? styles.chipTextActive : null]}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity style={styles.addBtn} onPress={handleAddPassenger}>
                      <Plus color="#FFFFFF" size={14} style={{ marginRight: 4 }} />
                      <Text style={styles.addBtnText}>Add Passenger</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.navRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStage('credentials')}>
                    <Text style={styles.secondaryBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handlePassengersNext}>
                    <Text style={styles.primaryBtnText}>Continue to Verify</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STAGE: OTP VERIFICATION ── */}
            {stage === 'otp' && (
              <View style={styles.stageContent}>
                <View style={styles.otpHeaderSection}>
                  <Smartphone color={BRAND_ORANGE} size={36} />
                  <Text style={styles.stageTitle}>OTP Verification</Text>
                  <Text style={styles.stageSub}>
                    Enter the 6-digit code sent to your IRCTC registered mobile number.
                  </Text>
                </View>

                <OtpInputRow length={6} value={otpValue} onChange={setOtpValue} />

                <View style={styles.otpTimerRow}>
                  {otpTimer > 0 ? (
                    <Text style={styles.otpTimerText}>
                      Resend OTP in <Text style={{ fontWeight: '700', color: BRAND_ORANGE }}>{otpTimer}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOtp}>
                      <Text style={styles.otpResendText}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.otpHint}>
                  For demo purposes, enter any 6-digit code (e.g. 123456) to proceed.
                </Text>

                <View style={styles.navRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStage('passengers')}>
                    <Text style={styles.secondaryBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1 }, isSubmitting ? styles.disabledBtn : null]}
                    onPress={handleVerifyAndLink}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Verify & Link</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STAGE: SUCCESS ── */}
            {stage === 'success' && (
              <View style={styles.successContent}>
                <ShieldCheck color="#27AE60" size={56} />
                <Text style={styles.successTitle}>IRCTC Linked!</Text>
                <Text style={styles.successSub}>
                  Your IRCTC account has been successfully linked. Passenger profiles are now synced for quick prefill.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  stageBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stageItem: {
    alignItems: 'center',
    gap: 4,
  },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDotActive: {
    backgroundColor: BRAND_NAVY,
  },
  stageDotInactive: {
    backgroundColor: '#E0E0E0',
  },
  stageDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stageDotTextActive: {
    color: '#FFFFFF',
  },
  stageLabel: {
    fontSize: 10,
    color: '#AAAAAA',
    fontWeight: '600',
  },
  stageLabelActive: {
    color: BRAND_NAVY,
  },
  body: {
    paddingHorizontal: 20,
  },
  stageContent: {
    paddingVertical: 20,
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  stageSub: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 20,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingLeft: 42,
    paddingRight: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#777777',
    lineHeight: 16,
  },
  // Passenger card styles
  passengerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 8,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  passengerSub: {
    fontSize: 11,
    color: '#555555',
    marginTop: 2,
  },
  // Add form
  addForm: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    marginBottom: 16,
  },
  addFormTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    minWidth: 60,
    height: 34,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#FFF3EC',
    borderColor: BRAND_ORANGE,
  },
  chipText: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '500',
  },
  chipTextActive: {
    color: BRAND_ORANGE,
    fontWeight: '700',
  },
  chipSmall: {
    paddingHorizontal: 10,
    height: 30,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  chipSmallText: {
    fontSize: 11,
    color: '#555555',
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_NAVY,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // OTP stage
  otpHeaderSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  otpTimerRow: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  otpTimerText: {
    fontSize: 13,
    color: '#555555',
  },
  otpResendText: {
    fontSize: 13,
    color: BRAND_ORANGE,
    fontWeight: '700',
  },
  otpHint: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
    marginTop: 8,
  },
  // Navigation row
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: BRAND_ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: BRAND_ORANGE,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: BRAND_ORANGE,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  // Success state
  successContent: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#27AE60',
  },
  successSub: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
