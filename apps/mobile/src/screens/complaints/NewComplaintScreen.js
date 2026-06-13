import React, { useState, useEffect } from 'react';
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
import { useTracely } from '../../context/TracelyContext';
import ComplaintTypeSelector from './components/ComplaintTypeSelector';
import PhotoUploader from './components/PhotoUploader';
import { fileComplaint } from './services/complaintService';
import { COLORS } from '../../constants';
import apiClient from '../../services/apiClient';

export default function NewComplaintScreen({ navigation }) {
  const { currentUser, activeJourney } = useTracely();

  // Form target selector state: '' | 'STATION' | 'TRAIN'
  const [complaintTarget, setComplaintTarget] = useState(activeJourney ? 'TRAIN' : '');

  // Form states
  const [complaintType, setComplaintType] = useState(null);
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);

  // Station Target states
  const [manualStationCode, setManualStationCode] = useState('');
  const [manualPlatform, setManualPlatform] = useState('');

  // Train Target states
  const [manualPnr, setManualPnr] = useState('');
  const [manualTrainNumber, setManualTrainNumber] = useState('');
  const [manualTrainName, setManualTrainName] = useState('');
  const [manualCoach, setManualCoach] = useState('');
  const [manualTravelDate, setManualTravelDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // PNR Fetching states
  const [pnrLoading, setPnrLoading] = useState(false);
  const [pnrError, setPnrError] = useState('');
  const [pnrSuccess, setPnrSuccess] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [complaintFiled, setComplaintFiled] = useState(false);

  const isSubmittedRef = React.useRef(false);

  // Warn on orphaned photo upload when form is abandoned
  useEffect(() => {
    return () => {
      if (photoUrl && !isSubmittedRef.current) {
        console.warn('[PHOTO] Orphaned upload may exist:', photoUrl);
      }
    };
  }, [photoUrl]);

  const hasActiveJourney = !!activeJourney;

  const getExpoPushToken = async () => {
    try {
      // Avoid calling push notifications if running in Expo Go (which doesn't support remote notifications in SDK 53)
      try {
        const Constants = require('expo-constants').default || require('expo-constants');
        const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
        if (isExpoGo) {
          console.log('[PUSH] Running in Expo Go — skipping push token request to prevent SDK 53 native error');
          return null;
        }
      } catch (e) {
        console.warn('[PUSH] Could not load expo-constants:', e.message);
      }

      // Dynamic require to prevent crash on Expo Go SDK 53 during app startup
      let Notifications;
      try {
        Notifications = require('expo-notifications');
      } catch (e) {
        console.warn('Could not require expo-notifications:', e.message);
        return null;
      }

      if (!Notifications || typeof Notifications.requestPermissionsAsync !== 'function') {
        console.warn('expo-notifications is not supported or exported correctly on this platform/client');
        return null;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return null;
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (err) {
      console.warn('Push notifications not available on this client/build:', err.message);
      return null;
    }
  };

  const fetchPnrDetails = async (pnrVal) => {
    const cleanPnr = pnrVal.replace(/\D/g, '');
    if (cleanPnr.length !== 10) {
      setPnrError('PNR must be exactly 10 digits');
      return;
    }

    setPnrLoading(true);
    setPnrError('');
    setPnrSuccess('');

    try {
      const response = await apiClient.post('/journeys/pnr', { pnr: cleanPnr });
      const journey = response.data?.data;
      if (journey) {
        setManualTrainNumber(journey.train_number || '');
        setManualTrainName(journey.train_name || '');
        setManualCoach(journey.coach || '');
        if (journey.travel_date) {
          setManualTravelDate(journey.travel_date);
        }
        setPnrSuccess(`✓ Verified: ${journey.train_name || 'Train'} (${journey.train_number})`);
        setErrors((prev) => ({ ...prev, pnr: null, trainNumber: null, travelDate: null }));
      } else {
        throw new Error('No journey data returned');
      }
    } catch (err) {
      console.error('PNR fetch error:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to retrieve PNR details.';
      setPnrError(msg);
    } finally {
      setPnrLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!complaintType) {
      newErrors.complaintType = 'Please select a complaint category';
    }
    if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (description.trim().length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    if (!complaintTarget) {
      newErrors.complaintTarget = 'Please select Station or Train Journey';
    } else {
      if (complaintTarget === 'STATION' && !manualStationCode.trim()) {
        newErrors.stationCode = 'Please enter a station code';
      }
      if (complaintTarget === 'TRAIN') {
        if (!hasActiveJourney) {
          if (!manualPnr.trim()) {
            newErrors.pnr = 'Please enter your PNR number';
          } else if (manualPnr.trim().length !== 10) {
            newErrors.pnr = 'PNR must be exactly 10 digits';
          }
          if (!manualTrainNumber.trim()) {
            newErrors.trainNumber = 'Please enter a train number';
          } else if (manualTrainNumber.trim().length !== 5) {
            newErrors.trainNumber = 'Train number must be exactly 5 digits';
          }
          if (!manualTravelDate.trim()) {
            newErrors.travelDate = 'Please enter a travel date';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      const pushToken = await getExpoPushToken();

      const finalDescription = (complaintTarget === 'STATION' && manualPlatform.trim())
        ? `[Platform ${manualPlatform.trim()}] ${description.trim()}`
        : description.trim();

      const payload = {
        complaint_type: complaintType,
        description: finalDescription,
        photo_url: photoUrl || undefined,
        expo_push_token: pushToken || undefined,
        pnr_number: complaintTarget === 'TRAIN'
          ? (hasActiveJourney ? activeJourney.pnr : manualPnr || undefined)
          : undefined,
        train_number: complaintTarget === 'TRAIN'
          ? (hasActiveJourney ? activeJourney.train_number : manualTrainNumber || undefined)
          : undefined,
        train_name: complaintTarget === 'TRAIN'
          ? (hasActiveJourney ? activeJourney.train_name : manualTrainName || undefined)
          : undefined,
        coach: complaintTarget === 'TRAIN'
          ? (hasActiveJourney ? activeJourney.coach : manualCoach || undefined)
          : undefined,
        berth: complaintTarget === 'TRAIN'
          ? (hasActiveJourney ? activeJourney.berth : undefined)
          : undefined,
        station_code: complaintTarget === 'STATION'
          ? manualStationCode.trim().toUpperCase()
          : 'UNKNOWN',
        travel_date: complaintTarget === 'TRAIN'
          ? (hasActiveJourney ? activeJourney.travel_date : manualTravelDate || undefined)
          : manualTravelDate || undefined,
      };

      const result = await fileComplaint(payload);
      setLoading(false);

      if (result && result.data) {
        isSubmittedRef.current = true;
        setComplaintFiled(true);
        navigation.navigate('ComplaintDetail', {
          complaintId: result.data.id,
          showSuccess: true,
        });
      }
    } catch (err) {
      setLoading(false);
      const message = err.response?.data?.error || err.message || 'Failed to submit. Please try again.';
      setSubmitError(message);
    }
  };

  const renderStepHeader = (num, title, isLast = false, optional = false) => {
    const isCompleted =
      (num === 1 && (
        complaintTarget === 'STATION'
          ? manualStationCode.trim() !== ''
          : complaintTarget === 'TRAIN'
            ? (hasActiveJourney || (manualPnr.trim().length === 10 && manualTrainNumber.trim().length === 5))
            : false
      )) ||
      (num === 2 && complaintType !== null) ||
      (num === 3 && description.length >= 10 && description.length <= 500) ||
      (num === 4 && photoUrl !== null);

    return (
      <View style={styles.stepHeaderRow}>
        <View style={styles.stepLeftColumn}>
          <View style={[styles.circle, isCompleted ? styles.completedCircle : styles.activeCircle]}>
            <Text style={[styles.circleText, { color: '#FFFFFF' }]}>{num}</Text>
          </View>
          {!isLast && <View style={styles.verticalLine} />}
        </View>
        <View style={styles.stepRightColumn}>
          <Text style={styles.stepHeading}>
            {title} {optional && <Text style={styles.optionalText}>(Optional)</Text>}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>File a Grievance</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ComplaintsHome')}>
          <Text style={styles.headerLink}>View Recent Grievances →</Text>
        </TouchableOpacity>
      </View>

      {submitError ? (
        <View style={styles.submitErrorBanner}>
          <AlertTriangle color="#CC0000" size={20} style={styles.bannerIcon} />
          <Text style={styles.submitErrorText}>{submitError}</Text>
        </View>
      ) : null}

      {/* Step 1: Journey Details */}
      <View style={styles.stepContainer}>
        {renderStepHeader(1, 'Journey Details')}
        <View style={styles.stepContentOffset}>
          {/* Target Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                complaintTarget === 'STATION' ? styles.toggleBtnActive : styles.toggleBtnInactive,
              ]}
              onPress={() => {
                setComplaintTarget('STATION');
                setErrors((prev) => ({ ...prev, complaintTarget: null, stationCode: null }));
              }}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  complaintTarget === 'STATION' ? styles.toggleBtnTextActive : styles.toggleBtnTextInactive,
                ]}
              >
                Regarding Station
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                complaintTarget === 'TRAIN' ? styles.toggleBtnActive : styles.toggleBtnInactive,
              ]}
              onPress={() => {
                setComplaintTarget('TRAIN');
                setErrors((prev) => ({ ...prev, complaintTarget: null, pnr: null, trainNumber: null, travelDate: null }));
              }}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  complaintTarget === 'TRAIN' ? styles.toggleBtnTextActive : styles.toggleBtnTextInactive,
                ]}
              >
                Regarding Train
              </Text>
            </TouchableOpacity>
          </View>
          {errors.complaintTarget && (
            <Text style={[styles.errorText, { marginBottom: 10 }]}>{errors.complaintTarget}</Text>
          )}

          {complaintTarget === 'STATION' && (
            <View style={styles.manualForm}>
              <Text style={styles.inputLabel}>Station Code *</Text>
              <TextInput
                style={[styles.input, errors.stationCode ? styles.inputError : null]}
                placeholder="e.g. NDLS"
                placeholderTextColor={COLORS.placeholderText}
                autoCapitalize="characters"
                maxLength={7}
                value={manualStationCode}
                onChangeText={(val) => {
                  setManualStationCode(val);
                  if (errors.stationCode) setErrors({ ...errors, stationCode: null });
                }}
              />
              {errors.stationCode && <Text style={styles.errorText}>{errors.stationCode}</Text>}

              <Text style={styles.inputLabel}>Platform / Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Platform 4 or Near waiting room"
                placeholderTextColor={COLORS.placeholderText}
                value={manualPlatform}
                onChangeText={setManualPlatform}
              />
            </View>
          )}

          {complaintTarget === 'TRAIN' && (
            hasActiveJourney ? (
              <View style={styles.readOnlyCard}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Train:</Text>
                  <Text style={styles.cardValue}>
                    {activeJourney.train_number} — {activeJourney.train_name}
                  </Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Coach / Berth:</Text>
                  <Text style={styles.cardValue}>
                    {activeJourney.coach || 'N/A'} / {activeJourney.berth || 'N/A'}
                  </Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Station:</Text>
                  <Text style={styles.cardValue}>{activeJourney.boarding_station}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Date:</Text>
                  <Text style={styles.cardValue}>{activeJourney.travel_date}</Text>
                </View>
                <Text style={styles.cardFooterText}>Pre-filled from your active journey</Text>
              </View>
            ) : (
              <View style={styles.manualForm}>
                <Text style={styles.inputLabel}>PNR Number *</Text>
                <View style={styles.pnrInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }, errors.pnr ? styles.inputError : null]}
                    placeholder="10-digit PNR"
                    placeholderTextColor={COLORS.placeholderText}
                    keyboardType="numeric"
                    maxLength={10}
                    value={manualPnr}
                    onChangeText={(val) => {
                      setManualPnr(val);
                      if (errors.pnr) setErrors({ ...errors, pnr: null });
                      if (pnrError) setPnrError('');
                      if (pnrSuccess) setPnrSuccess('');
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.verifyBtn, pnrLoading || manualPnr.length !== 10 ? styles.verifyBtnDisabled : null]}
                    onPress={() => fetchPnrDetails(manualPnr)}
                    disabled={pnrLoading || manualPnr.length !== 10}
                  >
                    {pnrLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {errors.pnr && <Text style={styles.errorText}>{errors.pnr}</Text>}
                {pnrError ? <Text style={styles.errorText}>{pnrError}</Text> : null}
                {pnrSuccess ? <Text style={styles.successText}>{pnrSuccess}</Text> : null}

                <Text style={styles.inputLabel}>Train Number *</Text>
                <TextInput
                  style={[styles.input, errors.trainNumber ? styles.inputError : null]}
                  placeholder="e.g. 12951"
                  placeholderTextColor={COLORS.placeholderText}
                  keyboardType="numeric"
                  maxLength={5}
                  value={manualTrainNumber}
                  onChangeText={(val) => {
                    setManualTrainNumber(val);
                    if (errors.trainNumber) setErrors({ ...errors, trainNumber: null });
                  }}
                />
                {errors.trainNumber && <Text style={styles.errorText}>{errors.trainNumber}</Text>}

                <Text style={styles.inputLabel}>Train Name (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                  placeholder="Train Name (auto-filled on verify)"
                  placeholderTextColor={COLORS.placeholderText}
                  value={manualTrainName}
                  editable={false}
                />

                <Text style={styles.inputLabel}>Coach (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. B4"
                  placeholderTextColor={COLORS.placeholderText}
                  autoCapitalize="characters"
                  maxLength={5}
                  value={manualCoach}
                  onChangeText={setManualCoach}
                />

                <Text style={styles.inputLabel}>Travel Date *</Text>
                <TextInput
                  style={[styles.input, errors.travelDate ? styles.inputError : null]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.placeholderText}
                  maxLength={10}
                  value={manualTravelDate}
                  onChangeText={(val) => {
                    setManualTravelDate(val);
                    if (errors.travelDate) setErrors({ ...errors, travelDate: null });
                  }}
                />
                {errors.travelDate && <Text style={styles.errorText}>{errors.travelDate}</Text>}
              </View>
            )
          )}
        </View>
      </View>

      {/* Step 2: Grievance Category */}
      <View style={styles.stepContainer}>
        {renderStepHeader(2, 'Grievance Category')}
        <View style={styles.stepContentOffset}>
          <ComplaintTypeSelector
            selected={complaintType}
            onSelect={(type) => {
              setComplaintType(type);
              if (errors.complaintType) setErrors({ ...errors, complaintType: null });
            }}
          />
          {errors.complaintType && <Text style={styles.errorText}>{errors.complaintType}</Text>}

          {complaintType === 'SAFETY' && (
            <View style={styles.warningBanner}>
              <AlertTriangle color="#E8621A" size={18} style={styles.bannerIcon} />
              <Text style={styles.warningText}>
                Safety concerns are auto-escalated to IN_PROGRESS status for immediate attention.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Step 3: Description */}
      <View style={styles.stepContainer}>
        {renderStepHeader(3, 'Description')}
        <View style={styles.stepContentOffset}>
          <TextInput
            style={[styles.textArea, errors.description ? styles.inputError : null]}
            placeholder="Describe the issue in detail..."
            placeholderTextColor={COLORS.placeholderText}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={(val) => {
              setDescription(val);
              if (errors.description) setErrors({ ...errors, description: null });
            }}
          />
          <View style={styles.counterRow}>
            {errors.description ? (
              <Text style={styles.errorText}>{errors.description}</Text>
            ) : (
              <View />
            )}
            <Text
              style={[
                styles.charCounter,
                description.length > 500 ? styles.charCounterError : null,
              ]}
            >
              {description.length}/500
            </Text>
          </View>
        </View>
      </View>

      {/* Step 4: Evidence Upload */}
      <View style={styles.stepContainer}>
        {renderStepHeader(4, 'Evidence Upload', true, true)}
        <View style={styles.stepContentOffset}>
          <PhotoUploader
            userId={currentUser?.id}
            onPhotoUploaded={setPhotoUrl}
            onUploadError={(err) => console.log('Photo upload error:', err)}
          />
        </View>
      </View>

      {/* Submit Action */}
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
            <Text style={styles.submitBtnText}>Submit Grievance</Text>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
  },
  headerLink: {
    fontSize: 13,
    color: COLORS.brandOrange || '#E8621A',
    fontWeight: '600',
  },
  submitErrorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  submitErrorText: {
    fontSize: 13,
    color: '#CC0000',
    fontWeight: '600',
    flex: 1,
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLeftColumn: {
    alignItems: 'center',
    marginRight: 12,
    width: 28,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    backgroundColor: '#1A3557', // brandNavy
  },
  completedCircle: {
    backgroundColor: '#1A3557',
  },
  circleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  verticalLine: {
    width: 2,
    backgroundColor: '#E0E0E0',
    height: 12,
    marginTop: 4,
  },
  stepRightColumn: {
    flex: 1,
    justifyContent: 'center',
    height: 28,
  },
  stepHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#888888',
  },
  stepContentOffset: {
    paddingLeft: 40,
    marginTop: 8,
  },
  readOnlyCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 90,
  },
  cardValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  cardFooterText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  manualForm: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.dividerGrey || '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#CC0000',
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.dividerGrey || '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
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
    marginTop: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3EC',
    borderColor: COLORS.brandOrange || '#E8621A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  bannerIcon: {
    marginRight: 10,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.brandOrange || '#E8621A',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  submitContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.brandOrange || '#E8621A',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E8621A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#1A3557', // COLORS.brandNavy
  },
  toggleBtnInactive: {
    backgroundColor: 'transparent',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  toggleBtnTextInactive: {
    color: '#555555',
  },
  pnrInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyBtn: {
    backgroundColor: '#1A3557', // brandNavy
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  verifyBtnDisabled: {
    backgroundColor: '#AAAAAA',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  successText: {
    color: '#2E7D32', // green
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
