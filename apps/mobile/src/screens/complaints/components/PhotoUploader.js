import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Lucide from 'lucide-react-native';
import { COLORS } from '../../../constants';
import supabase from '../../../services/supabaseClient';
import apiClient from '../../../services/apiClient';

export default function PhotoUploader({ onPhotoUploaded, userId, onUploadError }) {
  const [uploadState, setUploadState] = useState('idle'); // idle | picking | uploading | uploaded | error
  const [photoUrl, setPhotoUrl] = useState(null);
  const [tempFileName, setTempFileName] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePickAndUpload = async () => {
    // 1. Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setUploadState('error');
      setErrorMsg('Permission to access photos was denied');
      onUploadError?.('Permission denied');
      return;
    }

    // 2. Launch picker
    setUploadState('picking');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (result.canceled) {
      setUploadState('idle');
      return;
    }

    // 3. Upload to Supabase Storage with temp UUID
    setUploadState('uploading');
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const file = result.assets[0];
      const fileName = `${userId || 'anonymous'}/${tempId}.jpg`;

      // Use XMLHttpRequest instead of fetch().blob() to convert file URI to Blob
      // (fetch.blob() fails on Android with 'Creating blobs from ArrayBuffer are not supported')
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.error('XHR conversion to blob failed:', e);
          reject(new TypeError('Network request failed'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', file.uri, true);
        xhr.send(null);
      });

      let uploadedUrl = null;
      try {
        const { data, error } = await supabase.storage
          .from('complaint-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('complaint-photos')
          .getPublicUrl(fileName);
        
        uploadedUrl = urlData.publicUrl;
      } catch (directErr) {
        console.warn('[PhotoUploader] Direct Supabase upload failed, trying upload proxy:', directErr.message);
        const formData = new FormData();
        formData.append('bucket', 'complaint-photos');
        formData.append('filePath', fileName);

        if (Platform.OS === 'web') {
          const fileObj = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          formData.append('file', fileObj);
        } else {
          formData.append('file', {
            uri: file.uri,
            name: 'photo.jpg',
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

      setPhotoUrl(uploadedUrl);
      setTempFileName(fileName); // stored for potential cleanup
      setUploadState('uploaded');
      onPhotoUploaded(uploadedUrl);
    } catch (err) {
      setUploadState('error');
      setErrorMsg('Upload failed. You can still submit without a photo.');
      onUploadError?.(err.message);
    }
  };

  // If user removes photo: delete from Supabase storage
  const handleRemove = async () => {
    if (tempFileName) {
      try {
        await supabase.storage.from('complaint-photos').remove([tempFileName]);
      } catch (e) { /* silently ignore cleanup errors */ }
    }
    setPhotoUrl(null);
    setTempFileName(null);
    setUploadState('idle');
    onPhotoUploaded(null);
  };

  return (
    <View style={styles.container}>
      {uploadState === 'idle' && (
        <TouchableOpacity
          style={styles.dashedBox}
          activeOpacity={0.75}
          onPress={handlePickAndUpload}
        >
          <Lucide.UploadCloud size={32} color={COLORS.brandOrange || '#E8621A'} style={styles.icon} />
          <Text style={styles.uploadText}>Tap to add photo (optional)</Text>
          <Text style={styles.browseText}>Browse Gallery</Text>
        </TouchableOpacity>
      )}

      {(uploadState === 'picking' || uploadState === 'uploading') && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.brandOrange || '#E8621A'} />
          <Text style={styles.loadingText}>Uploading image...</Text>
        </View>
      )}

      {uploadState === 'uploaded' && (
        <View style={styles.uploadedBox}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: photoUrl }} style={styles.thumbnail} />
            <View style={styles.checkmarkOverlay}>
              <Lucide.CheckCircle2 size={16} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.uploadedInfo}>
            <Text style={styles.successText}>Photo uploaded successfully!</Text>
            <TouchableOpacity
              style={styles.removeBtn}
              activeOpacity={0.75}
              onPress={handleRemove}
            >
              <Text style={styles.removeText}>Remove Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {uploadState === 'error' && (
        <View style={styles.errorBox}>
          <Lucide.AlertCircle size={28} color="#CC0000" style={styles.icon} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.75}
              onPress={handlePickAndUpload}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              activeOpacity={0.75}
              onPress={handleRemove}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  dashedBox: {
    borderWidth: 2,
    borderColor: COLORS.dividerGrey || '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  uploadText: {
    fontSize: 14,
    color: COLORS.textSecondary || '#555555',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  browseText: {
    fontSize: 12,
    color: COLORS.brandOrange || '#E8621A',
    fontWeight: '700',
  },
  loadingBox: {
    borderWidth: 1,
    borderColor: COLORS.dividerGrey || '#E0E0E0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary || '#555555',
    marginTop: 12,
  },
  uploadedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.dividerGrey || '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  checkmarkOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#27AE60',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  uploadedInfo: {
    flex: 1,
  },
  successText: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '600',
    marginBottom: 8,
  },
  removeBtn: {
    alignSelf: 'flex-start',
  },
  removeText: {
    fontSize: 13,
    color: '#CC0000',
    fontWeight: '700',
  },
  errorBox: {
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#CC0000',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 18,
  },
  errorActions: {
    flexDirection: 'row',
  },
  retryBtn: {
    backgroundColor: COLORS.brandOrange || '#E8621A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  retryText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skipBtn: {
    borderWidth: 1,
    borderColor: COLORS.textSecondary || '#555555',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
    fontWeight: '600',
  },
  icon: {
    alignSelf: 'center',
  },
});
