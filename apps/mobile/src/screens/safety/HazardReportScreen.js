import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert as AlertNative, SafeAreaView, Image, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabaseClient';
import { useTracely } from '../../context/TracelyContext';
import { postHazardReport } from './services/safetyService';
import AlertTypeCard from './components/AlertTypeCard';
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

const HAZARD_SUBTYPES = [
  { id: 'TRACK_DAMAGE', label: 'Track Damage / Defect' },
  { id: 'BROKEN_PLATFORM', label: 'Broken Platform / Infrastructure' },
  { id: 'POOR_LIGHTING', label: 'Poor Lighting / Security Hazard' },
  { id: 'UNMANNED_CROSSING', label: 'Unmanned Crossing Danger' },
  { id: 'FLOODING', label: 'Water Logging / Flooding' },
  { id: 'OTHER', label: 'Other Hazard' },
];

// Defensive imports
let ImagePicker;
try {
  ImagePicker = require('expo-image-picker');
} catch (_e) {
  ImagePicker = null;
}

let Location;
try {
  Location = require('expo-location');
} catch (_e) {
  Location = null;
}

export default function HazardReportScreen() {
  const navigation = useNavigation();
  const { currentUser, activeJourney } = useTracely();

  const [subtype, setSubtype] = useState('TRACK_DAMAGE');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const getCoordinates = async () => {
    try {
      if (Location) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy?.Balanced || 3,
            timeout: 5000 
          });
          return { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      }
    } catch (e) {
      console.warn('Location retrieval failed, using default coordinates:', e.message);
    }
    return { lat: 28.6419, lng: 77.2194 };
  };

  const handlePickImage = async () => {
    setSubmitError('');
    if (!ImagePicker) {
      // Fallback to mock photo
      console.warn('expo-image-picker is not available, using mock photo selection.');
      setPhotoUri('https://mock.storage/mock-hazard-photo.jpg');
      Alert.alert('Mock Image Selected', 'Mock photo has been selected for the hazard report.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access your gallery is required to upload a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Failed to pick image:', err.message);
      Alert.alert('Image Pick Error', 'An error occurred while selecting the photo.');
    }
  };

  const uploadPhoto = async (uri) => {
    if (!uri) return null;
    if (uri.startsWith('http')) return uri; // Already uploaded or mock url

    setUploading(true);
    const userId = currentUser?.id || 'anonymous';
    const fileName = `${userId}/hazard_${Date.now()}.jpg`;

    try {
      /* ORIGINAL: authenticated-user direct upload */
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('hazard-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('hazard-photos')
        .getPublicUrl(fileName);

      return data?.publicUrl || null;
    } catch (err) {
      console.warn('Supabase storage upload failed, attempting backend proxy upload:', err.message);
      try {
        const formData = new FormData();
        formData.append('bucket', 'hazard-photos');
        formData.append('filePath', fileName);

        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          formData.append('file', file);
        } else {
          formData.append('file', {
            uri: uri,
            name: 'photo.jpg',
            type: 'image/jpeg',
          });
        }

        const res = await apiClient.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return res.data?.data?.publicUrl || null;
      } catch (proxyErr) {
        console.error('Backend upload proxy also failed:', proxyErr.message);
        return null;
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const cleanDescription = String(description || '').trim();
    if (!cleanDescription) {
      Alert.alert('Validation Error', 'Please describe the hazard to help RPF personnel handle it.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // 1. Fetch Location Coordinates
      const coords = await getCoordinates();

      // 2. Upload Photo (if present)
      let photoUrl = null;
      if (photoUri) {
        photoUrl = await uploadPhoto(photoUri);
      }

      // 3. Post to Hazard API
      const payload = {
        alert_subtype: subtype,
        lat: coords.lat,
        lng: coords.lng,
        description: cleanDescription,
        photo_url: photoUrl || photoUri, // Fallback to photoUri if upload fails or is mock
        station_code: activeJourney?.boarding_station || 'NDLS'
      };

      await postHazardReport(payload);

      Alert.alert(
        'Hazard Reported',
        'Thank you for reporting this safety hazard. RPF team has been notified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error('Failed to report hazard:', err.message);
      setSubmitError('Failed to submit report. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          
          <Text style={styles.headerTitle}>Report Safety Hazard</Text>
          <Text style={styles.headerSubtitle}>
            Report track damage, broken platforms, water logging, or crossing hazards directly to the RPF.
          </Text>

          {/* Form Card */}
          <View style={styles.card}>
            
            {/* Section 1: Hazard Subtype */}
            <Text style={styles.label}>Select Hazard Category</Text>
            <View style={styles.radioGroup}>
              {HAZARD_SUBTYPES.map((item) => (
                <AlertTypeCard
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  isSelected={subtype === item.id}
                  onSelect={setSubtype}
                />
              ))}
            </View>

            {/* Section 2: Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Describe the Hazard *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Give details of the issue (e.g. broken step on platform 3, track crack near signal)..."
                placeholderTextColor="#7B8A9E"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.charCounter}>{description.length}/200</Text>
            </View>

            {/* Section 3: Photo Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Attach Photo Evidence (Optional)</Text>
              {photoUri ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: photoUri }} style={styles.previewImage} />
                  <TouchableOpacity 
                    style={styles.changePhotoButton}
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changePhotoText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Text style={styles.uploadButtonIcon}>📸</Text>
                  <Text style={styles.uploadButtonText}>Choose Photo from Gallery</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Error Message Box */}
            {submitError ? (
              <Text style={styles.errorText}>{submitError}</Text>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (submitting || uploading) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || uploading}
              activeOpacity={0.8}
            >
              {submitting || uploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>SUBMIT REPORT TO RPF</Text>
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
    marginBottom: 20,
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
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 11,
    color: '#7B8A9E',
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '500',
  },
  uploadButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E8621A',
    borderRadius: 12,
    paddingVertical: 20,
    backgroundColor: '#FFF8F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonIcon: {
    fontSize: 24,
  },
  uploadButtonText: {
    fontSize: 13,
    color: '#E8621A',
    fontWeight: '700',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  changePhotoButton: {
    backgroundColor: '#4B5563',
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
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
});
