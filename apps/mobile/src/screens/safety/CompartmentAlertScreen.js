import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert as AlertNative, SafeAreaView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTracely } from '../../context/TracelyContext';
import { postCompartmentAlert } from './services/safetyService';
import AlertTypeCard from './components/AlertTypeCard';

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

const ALERT_SUBTYPES = [
  { id: 'MALE_OCCUPANT', label: 'Male Occupant in Ladies Coach' },
  { id: 'HARASSMENT', label: 'Harassment / Misbehaviour' },
  { id: 'THREATENING_BEHAVIOUR', label: 'Threatening Behaviour' },
];

export default function CompartmentAlertScreen() {
  const navigation = useNavigation();
  const { activeJourney } = useTracely();

  const [subtype, setSubtype] = useState('MALE_OCCUPANT');
  const [trainNumber, setTrainNumber] = useState('');
  const [coach, setCoach] = useState('');
  const [berth, setBerth] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Autofill form from active journey context on mount
  useEffect(() => {
    if (activeJourney) {
      Promise.resolve().then(() => {
        setTrainNumber(activeJourney.train_number || '');
        setCoach(activeJourney.coach || '');
        setBerth(activeJourney.berth || '');
      });
    }
  }, [activeJourney]);

  const handleSubmit = async () => {
    const cleanTrainNumber = String(trainNumber || '').trim();
    const cleanCoach = String(coach || '').trim();
    const cleanBerth = String(berth || '').trim();
    const cleanDescription = String(description || '').trim();

    if (!cleanTrainNumber) {
      Alert.alert('Validation Error', 'Please enter a valid Train Number.');
      return;
    }
    if (!cleanCoach) {
      Alert.alert('Validation Error', 'Please enter the Coach Number (e.g. S5).');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        alert_subtype: subtype,
        train_number: cleanTrainNumber,
        coach: cleanCoach.toUpperCase(),
        berth: cleanBerth,
        description: cleanDescription
      };

      await postCompartmentAlert(payload);
      
      Alert.alert(
        'Alert Filed',
        'Your compartment alert has been logged. RPF has been notified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to submit compartment alert:', error.message);
      setSubmitError('Failed to send alert. Please try again or call 182.');
      Alert.alert('Submission Error', 'Failed to register your alert. Please call 182.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          
          <Text style={styles.headerTitle}>Compartment Violation Report</Text>
           <Text style={styles.headerSubtitle}>
            File an instant alert for security violations in {"women's"} coaches or general compartments.
          </Text>

          {/* Form Card */}
          <View style={styles.card}>
            
            {/* Section 1: Alert Subtype */}
            <Text style={styles.label}>Select Alert Category</Text>
            <View style={styles.radioGroup}>
              {ALERT_SUBTYPES.map((item) => (
                <AlertTypeCard
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  isSelected={subtype === item.id}
                  onSelect={setSubtype}
                />
              ))}
            </View>

            {/* Section 2: Journey Context */}
            <Text style={styles.label}>Train Journey Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Train Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 12951"
                placeholderTextColor="#7B8A9E"
                value={trainNumber}
                onChangeText={setTrainNumber}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Coach Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. S5"
                  placeholderTextColor="#7B8A9E"
                  value={coach}
                  onChangeText={setCoach}
                  maxLength={10}
                  autoCapitalize="characters"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Berth Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 32"
                  placeholderTextColor="#7B8A9E"
                  value={berth}
                  onChangeText={setBerth}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Section 3: Extra description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Context (Optional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Describe the issue briefly..."
                placeholderTextColor="#7B8A9E"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Error Message */}
            {submitError ? (
              <Text style={styles.errorText}>{submitError}</Text>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>TRANSMIT ALERT TO RPF</Text>
              )}
            </TouchableOpacity>

          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3557',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7B8A9E',
    lineHeight: 18,
    marginBottom: 20,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A3557',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  radioGroup: {
    gap: 10,
    marginBottom: 24,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  radioSelected: {
    borderColor: '#E8621A',
    backgroundColor: '#FFF8F4',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#E8621A',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8621A',
  },
  radioLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  radioLabelSelected: {
    color: '#E8621A',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1A3557',
    backgroundColor: '#F9FAFB',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#E8621A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#E8621A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  errorText: {
    color: '#CC0000',
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
