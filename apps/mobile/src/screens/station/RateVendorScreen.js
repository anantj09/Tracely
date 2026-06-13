import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { submitVendorReview } from './services/stationService';

const StarRating = ({ rating, onSelect }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <TouchableOpacity 
        key={i} 
        onPress={() => onSelect(i)}
        style={{ padding: 8, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ fontSize: 40, color: i <= rating ? '#F5A623' : '#CCCCCC' }}>
          {i <= rating ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    );
  }
  return <View style={styles.starContainer}>{stars}</View>;
};

export default function RateVendorScreen({ route, navigation }) {
  const { vendor } = route.params;
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (selectedRating === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitVendorReview({ vendor_id: vendor.id, rating: selectedRating, comment });
      Alert.alert('Thank you!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        Alert.alert('Already Reviewed', 'You already reviewed this vendor today.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to submit review');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Rate {vendor.name}</Text>
        
        <StarRating rating={selectedRating} onSelect={setSelectedRating} />

        <TextInput
          style={styles.input}
          placeholder="Share your experience (optional)"
          maxLength={100}
          multiline={true}
          numberOfLines={3}
          value={comment}
          onChangeText={setComment}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{comment.length}/100</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity 
          style={[styles.submitBtn, selectedRating === 0 && styles.disabledBtn]} 
          activeOpacity={0.75}
          onPress={handleSubmit}
          disabled={selectedRating === 0 || isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Review</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 14, elevation: 3, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1A3557', marginBottom: 24, textAlign: 'center' },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  input: { width: '100%', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16, height: 80 },
  counter: { alignSelf: 'flex-end', fontSize: 12, color: '#888', marginTop: 4, marginBottom: 16 },
  errorText: { color: '#E8621A', marginBottom: 16 },
  submitBtn: { backgroundColor: '#E8621A', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center' },
  disabledBtn: { backgroundColor: '#FFC8B3' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
