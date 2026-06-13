import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { reopenComplaint } from './services/complaintService';
import { COLORS } from '../../constants';

export default function ReopenScreen({ route, navigation }) {
  const { complaint } = route.params || {};

  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!complaint) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No complaint data provided.</Text>
      </View>
    );
  }

  // Calculate hours left before reopen window closes
  const getReopenHoursLeft = (deadline) => {
    if (!deadline) return 0;
    const diffMs = new Date(deadline) - new Date();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return hours > 0 ? hours : 0;
  };

  const hoursLeft = getReopenHoursLeft(complaint.reopen_deadline);

  const handleSubmit = async () => {
    setValidationError('');
    setErrorMsg('');

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 20) {
      setValidationError('Please describe what is still wrong (minimum 20 characters)');
      return;
    }

    setLoading(true);
    try {
      await reopenComplaint(complaint.id, { description: trimmedDesc });
      setLoading(false);
      // Navigate back to detail screen, which will automatically refetch details
      navigation.navigate('ComplaintDetail', {
        complaintId: complaint.id,
        showSuccess: false,
      });
    } catch (err) {
      setLoading(false);
      const message = err.response?.data?.error || err.message || 'Failed to submit reopening request. Please try again.';
      setErrorMsg(message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Reopen Policy</Text>
        <Text style={styles.infoBody}>
          You can reopen a resolved complaint if the issue persists.
        </Text>
        <Text style={styles.infoBody}>
          The complaint will be escalated for priority review.
        </Text>
      </View>

      {/* Error Banner */}
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <AlertTriangle color="#CC0000" size={18} style={styles.errorIcon} />
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Complaint Reference Card */}
      <View style={styles.card}>
        <Text style={styles.referenceHeading}>Reopening Complaint</Text>
        <Text style={styles.referenceNumber}>{complaint.reference_number}</Text>
      </View>

      {/* Description Form Card */}
      <View style={styles.card}>
        <Text style={styles.label}>What is still wrong?</Text>
        <TextInput
          style={[
            styles.textArea,
            isFocused ? styles.textAreaFocused : styles.textAreaUnfocused,
            validationError ? styles.textAreaError : null,
          ]}
          placeholder="Describe the ongoing issue... (minimum 20 characters)"
          placeholderTextColor={COLORS.placeholderText}
          multiline
          numberOfLines={6}
          maxLength={500}
          value={description}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={(val) => {
            setDescription(val);
            if (validationError) setValidationError('');
          }}
        />
        <View style={styles.counterRow}>
          {validationError ? (
            <Text style={styles.errorText}>{validationError}</Text>
          ) : (
            <View />
          )}
          <Text style={[styles.charCounter, description.length > 500 ? styles.charCounterError : null]}>
            {description.length}/500
          </Text>
        </View>
      </View>

      {/* Deadline Reminder */}
      {complaint.reopen_deadline && (
        <View style={styles.reminderRow}>
          <Text style={styles.reminderText}>
            ⏰ Reopen window closes in {hoursLeft > 0 ? `${hoursLeft} hours` : 'less than 1 hour'}
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.75}
          disabled={loading}
          onPress={handleSubmit}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Submit Reopen Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1565C0',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 6,
  },
  infoBody: {
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
    lineHeight: 18,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 10,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#CC0000',
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  referenceHeading: {
    fontSize: 12,
    color: COLORS.textSecondary || '#555555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  referenceNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.brandOrange || '#E8621A',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
    marginBottom: 12,
  },
  textArea: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textAreaUnfocused: {
    borderWidth: 1,
    borderColor: COLORS.dividerGrey || '#E0E0E0',
  },
  textAreaFocused: {
    borderWidth: 2,
    borderColor: COLORS.brandOrange || '#E8621A',
  },
  textAreaError: {
    borderColor: '#CC0000',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  charCounter: {
    fontSize: 12,
    color: '#888888',
  },
  charCounterError: {
    color: '#CC0000',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 12,
    fontWeight: '500',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  reminderText: {
    fontSize: 13,
    color: '#F5A623',
    fontWeight: '600',
  },
  submitContainer: {
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.brandOrange || '#E8621A',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E8621A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
