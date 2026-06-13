import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { voteAmenity } from './services/stationService';

function getRelativeTime(isoString) {
  if (!isoString) return 'Never updated';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
}

const TYPE_ICONS = {
  TOILET: '🚻', WATER: '💧', FOOD_STALL: '🍽️', MEDICAL: '➕',
  ATM: '💳', CLOAK_ROOM: '🧳', PREPAID_AUTO: '🛺',
  WAITING_ROOM: '🪑', ENQUIRY: 'ℹ️', PLATFORM_ENTRY: '🚪'
};

const STATUS_COLORS = {
  WORKING: '#27AE60', BROKEN: '#E8621A', CONFIRMED_BROKEN: '#CC0000', UNKNOWN: '#AAAAAA'
};

const StatusToggle = ({ amenity, onChangeStatus }) => {
  const [votingAction, setVotingAction] = useState(null);

  const handleVote = async (newStatus) => {
    if (amenity.current_status === newStatus) return;
    onChangeStatus(newStatus, true);
    setVotingAction(newStatus);
    try {
      await voteAmenity({ amenity_id: amenity.id, status: newStatus });
      onChangeStatus(newStatus, false); 
    } catch (err) {
      if (err.response && err.response.status === 429) {
        Alert.alert('Hold on', 'You recently voted. Please wait before voting again.');
      } else {
        Alert.alert('Error', err.message || 'Failed to update status.');
      }
      onChangeStatus(null, false, true);
    } finally {
      setVotingAction(null);
    }
  };

  return (
    <View style={styles.toggleContainer}>
      <TouchableOpacity 
        style={[styles.toggleBtn, amenity.current_status === 'WORKING' ? styles.activeBtn : styles.inactiveBtn]}
        activeOpacity={0.75}
        onPress={() => handleVote('WORKING')}
        disabled={!!votingAction}
      >
        {votingAction === 'WORKING' ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.toggleText, amenity.current_status === 'WORKING' ? styles.activeText : styles.inactiveText]}>✓ Working</Text>}
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.toggleBtn, amenity.current_status === 'BROKEN' ? styles.activeBtn : styles.inactiveBtn]}
        activeOpacity={0.75}
        onPress={() => handleVote('BROKEN')}
        disabled={!!votingAction}
      >
        {votingAction === 'BROKEN' ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.toggleText, amenity.current_status === 'BROKEN' ? styles.activeText : styles.inactiveText]}>✗ Broken</Text>}
      </TouchableOpacity>
    </View>
  );
};

export default function AmenityDetailScreen({ route }) {
  const [amenity, setAmenity] = useState(route.params.amenity);
  const [prevAmenity, setPrevAmenity] = useState(route.params.amenity);

  const handleStatusChange = (newStatus, isOptimistic, revert = false) => {
    if (revert) {
      setAmenity(prevAmenity);
    } else {
      if (isOptimistic) {
        setPrevAmenity(amenity);
      }
      setAmenity({ ...amenity, current_status: newStatus, last_vote_at: new Date().toISOString() });
    }
  };

  const icon = TYPE_ICONS[amenity.amenity_type] || '📍';
  const badgeColor = STATUS_COLORS[amenity.current_status] || STATUS_COLORS.UNKNOWN;

  return (
    <SafeAreaView style={styles.container}>
      {amenity.current_status === 'CONFIRMED_BROKEN' && (
        <View style={styles.redBanner}>
          <Text style={styles.bannerText}>⚠️ Multiple users reported this broken. Station manager notified.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.iconLg}>{icon}</Text>
        <Text style={styles.title}>{amenity.label}</Text>

        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{amenity.current_status}</Text>
        </View>

        <Text style={styles.metaText}>Last updated: {getRelativeTime(amenity.last_vote_at || amenity.last_status_update)}</Text>
        <Text style={styles.metaText}>
          {amenity.platform_number ? `Platform ${amenity.platform_number}` : 'Concourse level'}
        </Text>

        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Update Status</Text>
        <StatusToggle amenity={amenity} onChangeStatus={handleStatusChange} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  redBanner: { backgroundColor: '#CC0000', padding: 12, alignItems: 'center' },
  bannerText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 14, padding: 24, alignItems: 'center', elevation: 3 },
  iconLg: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A3557', marginBottom: 12, textAlign: 'center' },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  metaText: { fontSize: 14, color: '#666', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#EEE', width: '100%', marginVertical: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A3557', alignSelf: 'flex-start', marginBottom: 16 },
  toggleContainer: { flexDirection: 'row', width: '100%', gap: 12 },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  activeBtn: { backgroundColor: '#E8621A' },
  inactiveBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8621A' },
  toggleText: { fontSize: 16, fontWeight: '600' },
  activeText: { color: '#FFF' },
  inactiveText: { color: '#E8621A' }
});
