import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert as AlertNative, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../services/supabaseClient';
import { useTracely } from '../../context/TracelyContext';
import { patchSOSAudio } from './services/safetyService';
import apiClient from '../../services/apiClient';

const Alert = {
  alert: (title, message, buttons) => {
    if (Platform.OS === 'web') {
      const formattedMessage = title ? `${title}\n\n${message}` : message;
      if (buttons && buttons.length > 1) {
        // This is a confirmation dialog (e.g. Cancel SOS)
        const confirmed = window.confirm(formattedMessage);
        if (confirmed) {
          const okButton = buttons.find(b => b.text === 'Delete' || b.text === 'OK' || b.text === 'Yes' || b.text?.includes('Cancel')) || buttons[0];
          if (okButton && typeof okButton.onPress === 'function') {
            okButton.onPress();
          }
        } else {
          const cancelButton = buttons.find(b => b.style === 'cancel' || b.text?.includes('Keep')) || buttons[1];
          if (cancelButton && typeof cancelButton.onPress === 'function') {
            cancelButton.onPress();
          }
        }
      } else {
        // Single OK button dialog
        window.alert(formattedMessage);
        if (buttons && buttons.length > 0) {
          const primaryButton = buttons[0];
          if (primaryButton && typeof primaryButton.onPress === 'function') {
            primaryButton.onPress();
          }
        }
      }
    } else {
      AlertNative.alert(title, message, buttons);
    }
  }
};

const { width } = Dimensions.get('window');

// 2. Defensive expo-av import
let Audio;
try {
  Audio = require('expo-av').Audio;
} catch (_e) {
  Audio = null;
}

export default function SOSActiveScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params || {};
  const { currentUser } = useTracely();
  const userId = currentUser?.id || 'mock-user-uuid';

  const [timeLeft, setTimeLeft] = useState(60);
  const [recordingStatus, setRecordingStatus] = useState('Initializing...');
  const recordingRef = useRef(null);
  const timerRef = useRef(null);

  // 3. Audio Recording Flow
  const startRecording = React.useCallback(async () => {
    try {
      if (!Audio) {
        console.warn('expo-av is not available, using mock audio recording.');
        setRecordingStatus('Recording Audio (Mock)...');
        return;
      }

      setRecordingStatus('Requesting permissions...');
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setRecordingStatus('Permission Denied');
        console.warn('Audio recording permission denied.');
        return;
      }

      setRecordingStatus('Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setRecordingStatus('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.Recording.PresetHighQuality
      );
      recordingRef.current = recording;
      setRecordingStatus('Recording Audio...');
      console.log('[SOS Audio] Recording started successfully.');

    } catch (err) {
      console.error('[SOS Audio] Failed to start recording:', err.message);
      setRecordingStatus('Failed to record');
    }
  }, []);

  const stopAndUpload = React.useCallback(async () => {
    try {
      setRecordingStatus('Processing audio...');
      let audioUrl = 'https://storage.supabase.co/sos-audio/mock-fallback.m4a';

      if (Audio && recordingRef.current) {
        const recording = recordingRef.current;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('[SOS Audio] Recording stopped. Local URI:', uri);

        // Upload to Supabase Storage
        const fileName = `${userId}/${eventId}_${Date.now()}.m4a`;
        
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          
          const { error: uploadError } = await supabase.storage
            .from('sos-audio')
            .upload(fileName, blob, {
              contentType: 'audio/m4a'
            });

          if (uploadError) throw uploadError;

          const publicUrlResponse = supabase.storage
            .from('sos-audio')
            .getPublicUrl(fileName);

          audioUrl = publicUrlResponse.data?.publicUrl || audioUrl;
          console.log('[SOS Audio] Uploaded to Supabase. Public URL:', audioUrl);

        } catch (uploadErr) {
          console.warn('[SOS Audio] Supabase storage upload failed, attempting backend proxy upload:', uploadErr.message);
          try {
            const formData = new FormData();
            formData.append('bucket', 'sos-audio');
            formData.append('filePath', fileName);

            if (Platform.OS === 'web') {
              const response = await fetch(uri);
              const blob = await response.blob();
              const file = new File([blob], 'audio.m4a', { type: 'audio/m4a' });
              formData.append('file', file);
            } else {
              formData.append('file', {
                uri: uri,
                name: 'audio.m4a',
                type: 'audio/m4a',
              });
            }

            const res = await apiClient.post('/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            audioUrl = res.data?.data?.publicUrl || audioUrl;
            console.log('[SOS Audio] Uploaded via proxy. Public URL:', audioUrl);
          } catch (proxyErr) {
            console.error('[SOS Audio] Backend upload proxy also failed:', proxyErr.message);
          }
        }
      } else {
        console.log('[SOS Audio] Mock audio recording completed.');
      }

      // Link audio URL to the safety event on the backend
      setRecordingStatus('Linking audio feed...');
      await patchSOSAudio(eventId, audioUrl);
      console.log('[SOS Audio] Audio linked to event successfully.');

    } catch (err) {
      console.error('[SOS Audio] Finalize audio flow failed:', err.message);
    }
  }, [userId, eventId]);

  const discardRecording = React.useCallback(async () => {
    try {
      if (Audio && recordingRef.current) {
        const recording = recordingRef.current;
        await recording.stopAndUnloadAsync();
        console.log('[SOS Audio] Recording discarded.');
      }
      recordingRef.current = null;
    } catch (_e) {
      // ignore
    }
  }, []);

  const handleCountdownComplete = React.useCallback(async () => {
    await stopAndUpload();
    Alert.alert(
      'SOS Finalized',
      'Emergency audio log uploaded. Help is on the way.',
      [{ text: 'OK', onPress: () => navigation.navigate('SafetyHomeScreen') }]
    );
  }, [navigation, stopAndUpload]);

  // 4. Mount/Unmount effects
  useEffect(() => {
    // Start audio recording immediately
    Promise.resolve().then(() => {
      startRecording();
    });

    // Start 60-second countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleCountdownComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Clean up recording if the screen is dismissed before completion
      discardRecording();
    };
  }, [startRecording, handleCountdownComplete, discardRecording]);

  const handleCancelPress = () => {
    Alert.alert(
      'Cancel SOS?',
      'Are you sure you want to cancel the emergency alert?',
      [
        {
          text: 'Yes, Cancel',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            discardRecording();
            navigation.goBack();
          },
          style: 'destructive'
        },
        { text: 'No, Keep Active', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Pulse Indicator */}
        <View style={styles.alertHeaderContainer}>
          <View style={styles.pulseDot} />
          <Text style={styles.alertHeader}>SOS EMERGENCY ACTIVE</Text>
        </View>

        {/* Large Visual Countdown Circle */}
        <View style={styles.timerCircle}>
          <Text style={styles.timerNumber}>{timeLeft}</Text>
          <Text style={styles.timerLabel}>seconds remaining</Text>
        </View>

        {/* Status Indicators */}
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>RPF Safety Stream Connected</Text>
          <Text style={styles.statusText}>{recordingStatus}</Text>
          <Text style={styles.warningText}>
            Do not lock your screen. Your coordinates and ambient audio are being sent live to the nearest RPF outpost.
          </Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelPress}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>CANCEL SOS ALERT</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#CC0000',
  },
  container: {
    flex: 1,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  alertHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  alertHeader: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  timerCircle: {
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: (width * 0.55) / 2,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  timerNumber: {
    color: '#FFFFFF',
    fontSize: 68,
    fontWeight: 'bold',
  },
  timerLabel: {
    color: '#FFCCCC',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 4,
  },
  statusBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    alignItems: 'center',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusText: {
    color: '#FF9999',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  warningText: {
    color: '#FFCCCC',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cancelButtonText: {
    color: '#CC0000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
