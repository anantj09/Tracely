import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTracely } from '../../context/TracelyContext';
import { SCREENS, COLORS } from '../../constants';
import {
  ArrowLeft,
  Calendar,
  User,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  FileText,
  Upload,
  UserCheck,
  Lock,
  ShieldCheck,
  X,
  CheckSquare,
  Square,
  Info,
} from 'lucide-react-native';
import { submitPrefill } from './services/tatkalService';
import apiClient from '../../services/apiClient';
import supabase from '../../services/supabaseClient';

// Safe require for datetimepicker to prevent web crashes
let DateTimePicker;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  DateTimePicker = null;
}

export default function PreFillFormScreen({ navigation }) {
  const { currentUser } = useTracely();
  const [currentStep, setCurrentStep] = useState(1); // 1: Journey, 2: Passengers, 3: Urgency

  // Step 1 states: Journey Details
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [trainClass, setTrainClass] = useState(currentUser?.preferred_class || '3A');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 2 states: Passenger Details
  const [passengers, setPassengers] = useState([]);
  const [newPassengerName, setNewPassengerName] = useState('');
  const [newPassengerAge, setNewPassengerAge] = useState('');
  const [newPassengerGender, setNewPassengerGender] = useState('M');
  const [newPassengerBerth, setNewPassengerBerth] = useState('LB');
  const [passengerUserId, setPassengerUserId] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Step 3 states: Urgency
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgencyReason, setUrgencyReason] = useState('personal'); // personal | official | bereavement | medical
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | uploaded | error
  const [documentUrl, setDocumentUrl] = useState(null);
  const [tempFileName, setTempFileName] = useState(null);

  // Form submission and loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Terms & Conditions modal state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // JOURNEY_OVERLAP_LOCK error state
  const [overlapError, setOverlapError] = useState(null);
  const [errors, setErrors] = useState({});

  // On Step 2 mount, try fetching verified passenger list from IRCTC link
  useEffect(() => {
    if (currentStep === 2 && passengers.length === 0) {
      const fetchIrctcPassengers = async () => {
        try {
          const response = await apiClient.get('/tatkal/passenger-by-irctc');
          if (response.data && response.data.data && response.data.data.length > 0) {
            setPassengers(response.data.data);
          } else {
            // Default to account holder if no synced profiles exist
            setPassengers([
              {
                name: currentUser?.name || '',
                age: '',
                gender: 'M',
                berth_preference: 'LB',
              },
            ]);
          }
        } catch (err) {
          console.warn('Failed to load synced IRCTC passengers, fallback:', err);
          setPassengers([
            {
              name: currentUser?.name || '',
              age: '',
              gender: 'M',
              berth_preference: 'LB',
            },
          ]);
        }
      };
      fetchIrctcPassengers();
    }
  }, [currentStep, currentUser]);

  // Client-side urgency score calculation matching backend
  const getUrgencyScore = () => {
    let score = 5.0;
    if (urgencyReason === 'medical') score = 9.0;
    else if (urgencyReason === 'bereavement') score = 8.0;
    else if (urgencyReason === 'official') score = 7.0;

    if (documentUrl) {
      score += 1.0;
    }
    // Assume account is > 6 months active
    score += 0.5;

    return Math.min(score, 10.0);
  };

  // Date picker handler (native only)
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setTravelDate(formattedDate);
      if (errors.travelDate) setErrors((prev) => ({ ...prev, travelDate: null }));
    }
  };

  // Image Picker and Upload to private `tatkal-documents` bucket
  const handlePickAndUploadDocument = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Access to photos is required to upload document proof.');
        return;
      }

      setUploadState('uploading');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled) {
        setUploadState('idle');
        return;
      }

      const file = result.assets[0];
      const tempId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${currentUser?.id || 'anonymous'}/${tempId}.jpg`;

      // Convert URI to Blob
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.error('Blob conversion failed:', e);
          reject(new TypeError('Blob conversion failed'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', file.uri, true);
        xhr.send(null);
      });

      let uploadedUrl = null;
      try {
        const { data, error } = await supabase.storage
          .from('tatkal-documents')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('tatkal-documents')
          .getPublicUrl(fileName);
        
        uploadedUrl = urlData.publicUrl;
      } catch (directErr) {
        console.warn('[TatkalDoc] Direct Supabase upload failed, trying upload proxy:', directErr.message);
        const formData = new FormData();
        formData.append('bucket', 'tatkal-documents');
        formData.append('filePath', fileName);

        if (Platform.OS === 'web') {
          const fileObj = new File([blob], 'doc.jpg', { type: 'image/jpeg' });
          formData.append('file', fileObj);
        } else {
          formData.append('file', {
            uri: file.uri,
            name: 'doc.jpg',
            type: 'image/jpeg',
          });
        }

        const res = await apiClient.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        uploadedUrl = res.data?.data?.publicUrl;
      }

      if (!uploadedUrl) {
        throw new Error('Upload proxy returned empty URL');
      }

      setDocumentUrl(uploadedUrl);
      setTempFileName(fileName);
      setUploadState('uploaded');
    } catch (err) {
      console.error('Document upload error:', err);
      setUploadState('error');
      Alert.alert('Upload Failed', 'Failed to upload document. You can retry or submit without evidence.');
    }
  };

  const handleRemoveDocument = async () => {
    if (tempFileName) {
      try {
        await supabase.storage.from('tatkal-documents').remove([tempFileName]);
      } catch (e) {
        console.warn('Doc cleanup failed:', e);
      }
    }
    setDocumentUrl(null);
    setTempFileName(null);
    setUploadState('idle');
  };

  // Passenger Handlers
  const handleLookupUser = async () => {
    const cleanId = String(passengerUserId || '').trim();
    if (!cleanId) {
      Alert.alert('Validation Error', 'Please enter a User ID.');
      return;
    }

    setIsLookingUp(true);
    try {
      const response = await apiClient.get(`/users/lookup/${cleanId}`);
      if (response.data && response.data.data) {
        const { name, age, gender } = response.data.data;
        setNewPassengerName(name || '');
        setNewPassengerAge(age ? String(age) : '');
        setNewPassengerGender(gender || 'M');
        Alert.alert('User Found', `Successfully loaded details for ${name}.`);
      } else {
        Alert.alert('Not Found', 'User not found. Please check the ID.');
      }
    } catch (err) {
      console.warn('User lookup failed:', err.message);
      Alert.alert('Lookup Error', 'User not found. Please check the ID.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddPassenger = () => {
    if (!newPassengerName.trim()) {
      Alert.alert('Validation Error', 'Passenger name is required. Please enter a User ID and tap Lookup.');
      return;
    }
    const ageVal = parseInt(newPassengerAge, 10);
    if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
      Alert.alert('Validation Error', 'Please enter a valid age between 1 and 120.');
      return;
    }

    if (passengers.length >= 4) {
      Alert.alert('Limit Reached', 'You can add a maximum of 4 passengers for a Tatkal booking.');
      return;
    }

    const newPassenger = {
      name: newPassengerName.trim(),
      age: ageVal,
      gender: newPassengerGender,
      berth_preference: newPassengerBerth,
    };

    setPassengers([...passengers, newPassenger]);
    setNewPassengerName('');
    setNewPassengerAge('');
    setNewPassengerGender('M');
    setNewPassengerBerth('LB');
    setPassengerUserId('');
  };

  const handleRemovePassenger = (index) => {
    setPassengers(passengers.filter((_, idx) => idx !== index));
  };

  // Step Navigations & Validations
  const validateStep1 = () => {
    const errs = {};
    if (!fromStation.trim()) errs.fromStation = 'Departure station is required';
    else if (fromStation.trim().length > 7) errs.fromStation = 'Station code too long';

    if (!toStation.trim()) errs.toStation = 'Destination station is required';
    else if (toStation.trim().length > 7) errs.toStation = 'Station code too long';

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!travelDate.trim()) {
      errs.travelDate = 'Travel date is required';
    } else if (!dateRegex.test(travelDate.trim())) {
      errs.travelDate = 'Travel date must be in YYYY-MM-DD format';
    } else {
      const selected = new Date(travelDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errs.travelDate = 'Travel date cannot be in the past';
      }
    }

    if (trainNumber.trim() && trainNumber.trim().length !== 5) {
      errs.trainNumber = 'Train number must be exactly 5 digits';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    if (passengers.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one passenger profile.');
      return false;
    }

    // Verify each passenger has name & age
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name || !p.age) {
        Alert.alert('Validation Error', `Please complete profile details for passenger ${i + 1}.`);
        return false;
      }
    }

    // Enforce Account Holder Mandate
    if (!currentUser?.name) {
      Alert.alert('Account Status', 'Your name is missing in your user profile. Please complete setup.');
      return false;
    }

    const holderTruncated = currentUser.name.trim().substring(0, 16).toLowerCase();
    const isHolderPresent = passengers.some((p) => {
      const passengerTruncated = String(p.name || '').trim().substring(0, 16).toLowerCase();
      return passengerTruncated === holderTruncated;
    });

    if (!isHolderPresent) {
      Alert.alert(
        'Account Holder Mandate failed',
        `The account holder (${currentUser.name}) must be listed as one of the passengers.`
      );
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFormSubmit = async () => {
    if (!termsAccepted) {
      Alert.alert('Terms Required', 'You must accept the Terms, Rules & Cost Agreement before submitting.');
      return;
    }
    setIsSubmitting(true);
    setOverlapError(null);
    try {
      const payload = {
        from_station: fromStation.trim().toUpperCase(),
        to_station: toStation.trim().toUpperCase(),
        travel_date: travelDate.trim(),
        train_number: trainNumber.trim() || null,
        class: trainClass,
        passengers: passengers.map((p) => ({
          name: p.name,
          age: parseInt(p.age, 10),
          gender: p.gender,
          berth_preference: p.berth_preference || 'ND',
        })),
        is_urgent: isUrgent,
        urgency_reason: isUrgent ? urgencyReason : null,
        urgency_document_url: isUrgent ? documentUrl : null,
      };

      const response = await submitPrefill(payload);
      const reqId = response.data?.id;

      Alert.alert('Success', 'Tatkal pre-fill details registered successfully!', [
        {
          text: 'Proceed to Countdown',
          onPress: () => {
            navigation.navigate(SCREENS.TATKAL_COUNTDOWN || 'TatkalCountdown', {
              requestId: reqId,
            });
          },
        },
      ]);
    } catch (err) {
      console.warn('Submit Tatkal prefill failed:', err);
      // Handle JOURNEY_OVERLAP_LOCK specifically
      if (err.code === 'JOURNEY_OVERLAP_LOCK') {
        setOverlapError(err);
      } else {
        Alert.alert('Error', err.error || 'Failed to register prefill request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get focus border style
  const getFocusBorderStyle = useCallback((fieldName) => {
    if (focusedField === fieldName) {
      return { borderColor: '#E8621A', borderWidth: 2 };
    }
    return {};
  }, [focusedField]);

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#111111" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tatkal Prefill Wizard</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stepper bar */}
      <View style={styles.stepperContainer}>
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= step ? styles.stepCircleActive : styles.stepCircleInactive,
              ]}
            >
              {currentStep > step ? (
                <Check color="#FFFFFF" size={14} />
              ) : (
                <Text style={styles.stepCircleText}>{step}</Text>
              )}
            </View>
            {step < 3 && (
              <View
                style={[
                  styles.stepLine,
                  currentStep > step ? styles.stepLineActive : styles.stepLineInactive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* JOURNEY_OVERLAP_LOCK Error Card */}
        {overlapError && (
          <View style={styles.overlapErrorCard}>
            <View style={styles.overlapErrorHeader}>
              <Lock color="#E8621A" size={24} />
              <Text style={styles.overlapErrorTitle}>Journey Overlap Detected</Text>
            </View>
            <Text style={styles.overlapErrorMsg}>{overlapError.error}</Text>
            {overlapError.details && (
              <View style={styles.overlapErrorDetails}>
                <Text style={styles.overlapDetailText}>
                  Passenger: <Text style={{ fontWeight: '700' }}>{overlapError.details.passenger_name}</Text>
                </Text>
                <Text style={styles.overlapDetailText}>
                  Locked PNR: <Text style={{ fontWeight: '700' }}>{overlapError.details.pnr}</Text>
                </Text>
                <Text style={styles.overlapDetailText}>
                  Lock Window: {new Date(overlapError.details.lock_start).toLocaleString()} → {new Date(overlapError.details.lock_end).toLocaleString()}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.overlapBackBtn}
              onPress={() => { setOverlapError(null); setCurrentStep(1); }}
            >
              <ArrowLeft color="#FFFFFF" size={16} style={{ marginRight: 6 }} />
              <Text style={styles.overlapBackBtnText}>Edit Journey Details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 1: Journey Details */}
        {currentStep === 1 && (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>Journey Details</Text>
            <Text style={styles.sectionSub}>Provide departure/arrival stations and date</Text>

            <Text style={styles.fieldLabel}>From Station (Code) *</Text>
            <TextInput
              style={[styles.inputField, errors.fromStation ? styles.inputError : null, getFocusBorderStyle('fromStation')]}
              placeholder="e.g. NDLS"
              placeholderTextColor={COLORS.placeholderText}
              autoCapitalize="characters"
              value={fromStation}
              onFocus={() => setFocusedField('fromStation')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(val) => {
                setFromStation(val.toUpperCase());
                if (errors.fromStation) setErrors((prev) => ({ ...prev, fromStation: null }));
              }}
              maxLength={7}
            />
            {errors.fromStation && <Text style={styles.errorText}>{errors.fromStation}</Text>}

            <Text style={styles.fieldLabel}>To Station (Code) *</Text>
            <TextInput
              style={[styles.inputField, errors.toStation ? styles.inputError : null, getFocusBorderStyle('toStation')]}
              placeholder="e.g. MMCT"
              placeholderTextColor={COLORS.placeholderText}
              autoCapitalize="characters"
              value={toStation}
              onFocus={() => setFocusedField('toStation')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(val) => {
                setToStation(val.toUpperCase());
                if (errors.toStation) setErrors((prev) => ({ ...prev, toStation: null }));
              }}
              maxLength={7}
            />
            {errors.toStation && <Text style={styles.errorText}>{errors.toStation}</Text>}

            <Text style={styles.fieldLabel}>Travel Date (YYYY-MM-DD) *</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                style={[styles.inputField, { flex: 1, marginBottom: 0 }, errors.travelDate ? styles.inputError : null, getFocusBorderStyle('travelDate')]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.placeholderText}
                value={travelDate}
                onFocus={() => setFocusedField('travelDate')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(val) => {
                  setTravelDate(val);
                  if (errors.travelDate) setErrors((prev) => ({ ...prev, travelDate: null }));
                }}
                maxLength={10}
              />
              {Platform.OS !== 'web' && DateTimePicker && (
                <TouchableOpacity
                  style={styles.calendarBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar color={COLORS.brandOrange} size={20} />
                </TouchableOpacity>
              )}
            </View>
            {errors.travelDate && <Text style={styles.errorText}>{errors.travelDate}</Text>}

            {showDatePicker && DateTimePicker && (
              <DateTimePicker
                value={travelDate ? new Date(travelDate) : new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}

            <Text style={styles.fieldLabel}>Train Number (Optional)</Text>
            <TextInput
              style={[styles.inputField, errors.trainNumber ? styles.inputError : null, getFocusBorderStyle('trainNumber')]}
              placeholder="e.g. 12951"
              placeholderTextColor={COLORS.placeholderText}
              keyboardType="numeric"
              value={trainNumber}
              onFocus={() => setFocusedField('trainNumber')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(val) => {
                setTrainNumber(val);
                if (errors.trainNumber) setErrors((prev) => ({ ...prev, trainNumber: null }));
              }}
              maxLength={5}
            />
            {errors.trainNumber && <Text style={styles.errorText}>{errors.trainNumber}</Text>}

            <Text style={styles.fieldLabel}>Travel Class *</Text>
            <View style={styles.classGrid}>
              {['SL', '3A', '2A', '1A', 'GEN'].map((cls) => (
                <TouchableOpacity
                  key={cls}
                  style={[
                    styles.classTile,
                    trainClass === cls ? styles.classTileActive : styles.classTileInactive,
                  ]}
                  onPress={() => setTrainClass(cls)}
                >
                  <Text
                    style={[
                      styles.classTileText,
                      trainClass === cls ? styles.classTileTextActive : styles.classTileTextInactive,
                    ]}
                  >
                    {cls}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2: Passenger Details */}
        {currentStep === 2 && (
          <View style={styles.stepCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Passenger Profiles</Text>
                <Text style={styles.sectionSub}>Add/modify booking passengers (max 4)</Text>
              </View>
              <View style={styles.verificationBadge}>
                <UserCheck color="#27AE60" size={14} />
                <Text style={styles.verificationBadgeText}>IRCTC SYNC</Text>
              </View>
            </View>

            {/* List existing passengers */}
            {passengers.length > 0 ? (
              <View style={styles.passengerList}>
                {passengers.map((p, idx) => {
                  const holderName = currentUser?.name?.trim().substring(0, 16).toLowerCase() || '';
                  const pName = String(p.name || '').trim().substring(0, 16).toLowerCase();
                  const isAccountHolder = idx === 0 && pName === holderName;
                  return (
                    <View key={idx} style={[styles.passengerCard, isAccountHolder ? styles.passengerCardLocked : null]}>
                      <View style={styles.passengerInfo}>
                        {isAccountHolder
                          ? <ShieldCheck color="#27AE60" size={18} />
                          : <User color={COLORS.brandOrange} size={18} />
                        }
                        <View style={styles.passengerMeta}>
                          <View style={styles.passengerNameRow}>
                            <Text style={styles.passengerNameText}>{p.name}</Text>
                            {isAccountHolder && (
                              <View style={styles.holderBadge}>
                                <Text style={styles.holderBadgeText}>ACCOUNT HOLDER</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.passengerSubText}>
                            {p.age} yrs | {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'} | Preferred: {p.berth_preference || 'No Preference'}
                          </Text>
                        </View>
                      </View>
                      {isAccountHolder ? (
                        <Lock color="#AAAAAA" size={16} />
                      ) : (
                        <TouchableOpacity onPress={() => handleRemovePassenger(idx)}>
                          <Trash2 color="#CC0000" size={18} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyPassengersCard}>
                <Text style={styles.emptyText}>No passengers listed.</Text>
              </View>
            )}

            {passengers.length < 4 && (
              <View style={styles.addPassengerForm}>
                <Text style={styles.formTitle}>Add Passenger Details</Text>

                <View style={styles.lookupRow}>
                  <TextInput
                    style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Enter User ID (UUID)"
                    placeholderTextColor={COLORS.placeholderText}
                    value={passengerUserId}
                    onChangeText={setPassengerUserId}
                  />
                  <TouchableOpacity
                    style={[styles.lookupBtn, isLookingUp ? styles.lookupBtnDisabled : null]}
                    onPress={handleLookupUser}
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.lookupBtnText}>Lookup</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {newPassengerName ? (
                  <View style={styles.lookedUpPreview}>
                    <Text style={styles.previewLabel}>Passenger Details Found:</Text>
                    <Text style={styles.previewText}>Name: {newPassengerName}</Text>
                    <Text style={styles.previewText}>Age: {newPassengerAge}</Text>
                    <Text style={styles.previewText}>Gender: {newPassengerGender === 'M' ? 'Male' : newPassengerGender === 'F' ? 'Female' : 'Other'}</Text>
                  </View>
                ) : null}

                {/* COMMENTED OUT MANUAL PASSENGER ENTRY — uncomment for registered-user manual mode
                <TextInput
                  style={styles.formInput}
                  placeholder="Full Name (Exactly as in Govt ID)"
                  placeholderTextColor={COLORS.placeholderText}
                  value={newPassengerName}
                  onChangeText={setNewPassengerName}
                />

                <TextInput
                  style={styles.formInput}
                  placeholder="Age"
                  placeholderTextColor={COLORS.placeholderText}
                  keyboardType="numeric"
                  value={newPassengerAge}
                  onChangeText={setNewPassengerAge}
                  maxLength={3}
                />

                <Text style={styles.inlineLabel}>Gender</Text>
                <View style={styles.genderContainer}>
                  {['M', 'F', 'O'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderOption,
                        newPassengerGender === g ? styles.genderOptionActive : null,
                      ]}
                      onPress={() => setNewPassengerGender(g)}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          newPassengerGender === g ? styles.genderOptionTextActive : null,
                        ]}
                      >
                        {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                */}

                <Text style={styles.inlineLabel}>Berth Preference</Text>
                <View style={styles.berthContainer}>
                  {['LB', 'MB', 'UB', 'SL', 'SU', 'ND'].map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.berthOption,
                        newPassengerBerth === b ? styles.berthOptionActive : null,
                      ]}
                      onPress={() => setNewPassengerBerth(b)}
                    >
                      <Text
                        style={[
                          styles.berthOptionText,
                          newPassengerBerth === b ? styles.berthOptionTextActive : null,
                        ]}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.addBtn} onPress={handleAddPassenger}>
                  <Plus color="#FFFFFF" size={16} style={{ marginRight: 4 }} />
                  <Text style={styles.addBtnText}>Add Passenger</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* STEP 3: Urgency / Document proof */}
        {currentStep === 3 && (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>Urgency Declaration</Text>
            <Text style={styles.sectionSub}>Urgent bookings undergo prioritized firing queues</Text>

            <View style={styles.urgencyToggleRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.toggleTitle}>Declare Urgency</Text>
                <Text style={styles.toggleSub}>Enable if this journey is for critical reasons</Text>
              </View>
              <Switch
                trackColor={{ false: '#E0E0E0', true: '#FFD7C2' }}
                thumbColor={isUrgent ? COLORS.brandOrange : '#F5F5F5'}
                onValueChange={setIsUrgent}
                value={isUrgent}
              />
            </View>

            {isUrgent && (
              <View style={styles.urgencyDetails}>
                <Text style={styles.fieldLabel}>Reason for Urgency *</Text>
                <View style={styles.reasonList}>
                  {[
                    { key: 'medical', label: 'Medical Emergency' },
                    { key: 'bereavement', label: 'Bereavement / Funeral' },
                    { key: 'official', label: 'Official Duty / Exam' },
                    { key: 'personal', label: 'Other Personal Reasons' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.reasonItem,
                        urgencyReason === item.key ? styles.reasonItemActive : styles.reasonItemInactive,
                      ]}
                      onPress={() => setUrgencyReason(item.key)}
                    >
                      <Text
                        style={[
                          styles.reasonText,
                          urgencyReason === item.key ? styles.reasonTextActive : null,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {urgencyReason === item.key && <Check color={COLORS.brandOrange} size={16} />}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Upload Supporting Evidence (Optional)</Text>
                <Text style={styles.fieldHelpText}>
                  Uploading a medical certificate, exam letter, or other proof increases the priority score.
                </Text>

                {uploadState === 'idle' && (
                  <TouchableOpacity
                    style={styles.dashedUploadBox}
                    onPress={handlePickAndUploadDocument}
                  >
                    <Upload color={COLORS.brandOrange} size={32} style={{ marginBottom: 8 }} />
                    <Text style={styles.uploadBoxText}>Tap to upload proof image</Text>
                    <Text style={styles.uploadBoxSub}>Supports JPG, PNG</Text>
                  </TouchableOpacity>
                )}

                {uploadState === 'uploading' && (
                  <View style={styles.uploadFeedbackBox}>
                    <ActivityIndicator size="small" color={COLORS.brandOrange} />
                    <Text style={styles.feedbackText}>Uploading evidence...</Text>
                  </View>
                )}

                {uploadState === 'uploaded' && (
                  <View style={styles.uploadedDocumentCard}>
                    <FileText color="#27AE60" size={24} />
                    <View style={styles.docDetails}>
                      <Text style={styles.docSuccessTitle}>Document Uploaded</Text>
                      <TouchableOpacity onPress={handleRemoveDocument}>
                        <Text style={styles.docRemoveText}>Delete Document</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {uploadState === 'error' && (
                  <View style={styles.uploadFeedbackBox}>
                    <AlertTriangle color="#CC0000" size={20} />
                    <Text style={[styles.feedbackText, { color: '#CC0000' }]}>Upload failed.</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={handlePickAndUploadDocument}>
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Urgency Score Card */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreCardTitle}>Prioritization Index</Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Calculated Score:</Text>
                    <Text style={styles.scoreValue}>{getUrgencyScore().toFixed(1)} / 10.0</Text>
                  </View>
                  <Text style={styles.scoreHelp}>
                    Higher scores position your booking earlier in the scheduling queues during the fire window.
                  </Text>
                </View>
              </View>
            )}

            {/* Terms, Rules & Cost Agreement Checkbox */}
            <View style={styles.termsSection}>
              <TouchableOpacity
                style={styles.termsCheckboxRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                {termsAccepted
                  ? <CheckSquare color="#E8621A" size={22} />
                  : <Square color="#AAAAAA" size={22} />
                }
                <Text style={styles.termsCheckboxLabel}>
                  I have read and accept the{' '}
                  <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>
                    Terms, Rules & Cost Agreement
                  </Text>
                </Text>
              </TouchableOpacity>
              {!termsAccepted && (
                <Text style={styles.termsWarning}>
                  You must accept the agreement before submitting.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Terms & Rules Modal */}
        <Modal
          visible={showTermsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTermsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Terms, Rules & Cost Agreement</Text>
                <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                  <X color="#555555" size={24} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalRuleSection}>
                  <Text style={styles.modalRuleTitle}>📋 Tatkal Booking Rules</Text>
                  <Text style={styles.modalRuleText}>• Tatkal bookings open at 10:00 AM IST for AC classes and 11:00 AM IST for Sleeper/General classes, one day before the date of travel.</Text>
                  <Text style={styles.modalRuleText}>• A maximum of 4 passengers per request is permitted.</Text>
                  <Text style={styles.modalRuleText}>• The account holder must be listed as one of the passengers (Account Holder Mandate).</Text>
                  <Text style={styles.modalRuleText}>• Only one active request per booking window per user is allowed (Anti-Hoarding).</Text>
                </View>
                <View style={styles.modalRuleSection}>
                  <Text style={styles.modalRuleTitle}>💰 Cancellation & Refund Policy</Text>
                  <Text style={styles.modalRuleText}>• Tatkal tickets booked in AC classes are subject to a minimum cancellation charge of ₹180 or 50% of the fare, whichever is higher.</Text>
                  <Text style={styles.modalRuleText}>• Tatkal tickets booked in Sleeper class are subject to a minimum cancellation charge of ₹120 or 50% of the fare, whichever is higher.</Text>
                  <Text style={styles.modalRuleText}>• Confirmed Tatkal tickets are non-refundable if cancelled after chart preparation.</Text>
                  <Text style={styles.modalRuleText}>• No refund is applicable for "No Show" (failure to board the train).</Text>
                </View>
                <View style={styles.modalRuleSection}>
                  <Text style={styles.modalRuleTitle}>🛡️ Anti-Tout Regulations</Text>
                  <Text style={styles.modalRuleText}>• Account Holder Mandate: Your registered name must appear in the passenger list. Identity comparison is case-insensitive and trimmed.</Text>
                  <Text style={styles.modalRuleText}>• Journey Overlap Lock: Confirmed passengers are locked for the travel duration and cannot book overlapping Tatkal journeys.</Text>
                  <Text style={styles.modalRuleText}>• Anti-Hoarding Constraint: One Tatkal request per user per booking window prevents bulk booking.</Text>
                  <Text style={styles.modalRuleText}>• Violations may result in account suspension and forfeiture of booking privileges.</Text>
                </View>
                <View style={[styles.modalRuleSection, { backgroundColor: '#FFF3EC', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#E8621A' }]}>
                  <Text style={[styles.modalRuleText, { fontWeight: '600', color: '#111111' }]}>By proceeding, you confirm that all passenger details are accurate, that you are the legitimate account holder, and that you accept the cancellation charges and anti-tout regulations stated above.</Text>
                </View>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalAcceptBtn}
                onPress={() => { setTermsAccepted(true); setShowTermsModal(false); }}
              >
                <Check color="#FFFFFF" size={18} style={{ marginRight: 6 }} />
                <Text style={styles.modalAcceptBtnText}>Accept & Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Footer Nav Buttons */}
      <View style={styles.footer}>
        {currentStep > 1 ? (
          <TouchableOpacity style={styles.secondaryNavBtn} onPress={handlePrevStep}>
            <Text style={styles.secondaryNavBtnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {currentStep < 3 ? (
          <TouchableOpacity style={styles.primaryNavBtn} onPress={handleNextStep}>
            <Text style={styles.primaryNavBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryNavBtn, (isSubmitting || !termsAccepted) ? styles.disabledBtn : null]}
            onPress={handleFormSubmit}
            disabled={isSubmitting || !termsAccepted}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryNavBtnText}>Register Request</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#1A3557',
  },
  stepCircleInactive: {
    backgroundColor: '#E0E0E0',
  },
  stepCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepLine: {
    height: 2,
    width: 60,
  },
  stepLineActive: {
    backgroundColor: '#1A3557',
  },
  stepLineInactive: {
    backgroundColor: '#E0E0E0',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 14,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  inputError: {
    borderColor: '#CC0000',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#CC0000',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  calendarBtn: {
    backgroundColor: '#FFF3EC',
    borderWidth: 1.5,
    borderColor: '#E8621A',
    borderRadius: 10,
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  classTile: {
    flex: 1,
    minWidth: '18%',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTileActive: {
    backgroundColor: '#FFF3EC',
    borderColor: '#E8621A',
  },
  classTileInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  classTileText: {
    fontSize: 14,
    fontWeight: '700',
  },
  classTileTextActive: {
    color: '#E8621A',
  },
  classTileTextInactive: {
    color: '#555555',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  verificationBadgeText: {
    color: '#27AE60',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  passengerList: {
    gap: 10,
    marginBottom: 20,
  },
  passengerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passengerMeta: {
    marginLeft: 10,
  },
  passengerNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  passengerSubText: {
    fontSize: 12,
    color: '#555555',
    marginTop: 2,
  },
  emptyPassengersCard: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 10,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#AAAAAA',
    fontStyle: 'italic',
  },
  addPassengerForm: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
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
    marginBottom: 12,
  },
  inlineLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 6,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  genderOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptionActive: {
    backgroundColor: '#FFF3EC',
    borderColor: '#E8621A',
  },
  genderOptionText: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '500',
  },
  genderOptionTextActive: {
    color: '#E8621A',
    fontWeight: '700',
  },
  berthContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  berthOption: {
    paddingHorizontal: 10,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  berthOptionActive: {
    backgroundColor: '#FFF3EC',
    borderColor: '#E8621A',
  },
  berthOptionText: {
    fontSize: 11,
    color: '#555555',
    fontWeight: '500',
  },
  berthOptionTextActive: {
    color: '#E8621A',
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A3557',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  urgencyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  toggleSub: {
    fontSize: 12,
    color: '#555555',
    marginTop: 2,
  },
  urgencyDetails: {
    marginTop: 8,
  },
  reasonList: {
    gap: 8,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  reasonItemActive: {
    backgroundColor: '#FFF3EC',
    borderColor: '#E8621A',
  },
  reasonItemInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  reasonText: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  reasonTextActive: {
    color: '#E8621A',
    fontWeight: '700',
  },
  fieldHelpText: {
    fontSize: 11,
    color: '#777777',
    marginBottom: 10,
    lineHeight: 15,
  },
  dashedUploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  uploadBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },
  uploadBoxSub: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 2,
  },
  uploadFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
    gap: 10,
  },
  feedbackText: {
    fontSize: 13,
    color: '#555555',
  },
  retryBtn: {
    backgroundColor: '#E8621A',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  uploadedDocumentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
    gap: 12,
  },
  docDetails: {
    flex: 1,
  },
  docSuccessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#27AE60',
  },
  docRemoveText: {
    fontSize: 12,
    color: '#CC0000',
    fontWeight: '600',
    marginTop: 4,
  },
  scoreCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#E8621A',
    marginTop: 8,
  },
  scoreCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#555555',
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E8621A',
  },
  scoreHelp: {
    fontSize: 11,
    color: '#777777',
    lineHeight: 14,
  },
  footer: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  primaryNavBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#E8621A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  primaryNavBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryNavBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E8621A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  secondaryNavBtnText: {
    color: '#E8621A',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  // Locked account holder passenger card
  passengerCardLocked: {
    backgroundColor: '#F0FFF0',
    borderColor: '#C8E6C9',
  },
  passengerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  holderBadge: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  holderBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#27AE60',
    letterSpacing: 0.5,
  },
  // JOURNEY_OVERLAP_LOCK error card
  overlapErrorCard: {
    backgroundColor: '#FFF3EC',
    borderWidth: 1.5,
    borderColor: '#E8621A',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  overlapErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  overlapErrorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8621A',
  },
  overlapErrorMsg: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 19,
    marginBottom: 12,
  },
  overlapErrorDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFD7C2',
    marginBottom: 14,
    gap: 4,
  },
  overlapDetailText: {
    fontSize: 12,
    color: '#555555',
  },
  overlapBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8621A',
    borderRadius: 10,
    paddingVertical: 12,
  },
  overlapBackBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Terms & Rules styles
  termsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termsCheckboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    lineHeight: 19,
  },
  termsLink: {
    color: '#E8621A',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsWarning: {
    fontSize: 11,
    color: '#CC0000',
    marginTop: 6,
    marginLeft: 32,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalRuleSection: {
    marginBottom: 20,
  },
  modalRuleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A3557',
    marginBottom: 8,
  },
  modalRuleText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
    marginBottom: 4,
  },
  modalAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8621A',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 8,
  },
  modalAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  lookupBtn: {
    backgroundColor: '#E8621A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  lookupBtnDisabled: {
    opacity: 0.6,
  },
  lookupBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  lookedUpPreview: {
    backgroundColor: '#FFF8F5',
    borderWidth: 1,
    borderColor: '#FFD7C2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E8621A',
    marginBottom: 2,
  },
  previewText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
});
