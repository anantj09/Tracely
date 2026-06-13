import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { useSafety } from './hooks/useSafety';
import { COLORS } from '../../constants';

// Event type display config
const EVENT_CONFIG = {
  SOS: { label: 'SOS Alert', color: '#CC0000', bg: '#FFEBEE' },
  COMPARTMENT_VIOLATION: { label: 'Compartment Alert', color: '#E8621A', bg: '#FFF3EC' },
  HAZARD_REPORT: { label: 'Hazard Report', color: '#F5A623', bg: '#FFF8E1' },
};

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: '#CC0000', bg: '#FFEBEE' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: '#1565C0', bg: '#E3F2FD' },
  RESOLVED: { label: 'Resolved', color: '#27AE60', bg: '#E8F5E9' },
  FALSE_ALARM: { label: 'False Alarm', color: '#757575', bg: '#F5F5F5' },
};

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function EventCard({ item }) {
  const evConfig = EVENT_CONFIG[item.event_type] || { label: item.event_type, color: '#555', bg: '#F5F5F5' };
  const stConfig = STATUS_CONFIG[item.status] || { label: item.status, color: '#555', bg: '#F5F5F5' };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typePill, { backgroundColor: evConfig.bg }]}>
          <Text style={[styles.typePillText, { color: evConfig.color }]}>{evConfig.label}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: stConfig.bg }]}>
          <Text style={[styles.statusPillText, { color: stConfig.color }]}>{stConfig.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.train_number && (
          <Text style={styles.detailText}>🚂 Train {item.train_number}
            {item.coach ? ` · Coach ${item.coach}` : ''}
            {item.berth ? ` · Berth ${item.berth}` : ''}
          </Text>
        )}
        {item.alert_subtype && (
          <Text style={styles.detailText}>
            ⚠️ {item.alert_subtype.replace(/_/g, ' ')}
          </Text>
        )}
        {item.description ? (
          <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
        {item.sms_sent && (
          <Text style={styles.smsSentText}>✓ SMS sent to {item.sms_contacts_count} contact{item.sms_contacts_count !== 1 ? 's' : ''}</Text>
        )}
      </View>
    </View>
  );
}

export default function MyEventsScreen() {
  const { events, loading, error, refresh } = useSafety();

  useEffect(() => {
    let active = true;
    if (active) {
      Promise.resolve().then(() => {
        refresh();
      });
    }
    return () => { active = false; };
  }, [refresh]);

  if (loading) {
    return (
      <View style={styles.centreContainer}>
        <ActivityIndicator size="large" color={COLORS.brandOrange} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centreContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refresh()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={events.length === 0 ? styles.emptyContainer : styles.listContent}
      data={events}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <EventCard item={item} />}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => refresh()}
          tintColor={COLORS.brandOrange}
        />
      }
      ListEmptyComponent={
        <View style={styles.centreContainer}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptySubtitle}>Your safety alerts and reports will appear here.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surfaceGrey },
  listContent: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flex: 1 },
  centreContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.surfaceGrey },
  card: {
    backgroundColor: COLORS.pageWhite, borderRadius: 14, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typePillText: { fontSize: 11, fontWeight: '700' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  cardBody: { gap: 4, marginBottom: 10 },
  detailText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  descriptionText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.dividerGrey, paddingTop: 8 },
  timeText: { fontSize: 11, color: COLORS.placeholderText },
  smsSentText: { fontSize: 11, color: '#27AE60', fontWeight: '600' },
  errorText: { fontSize: 14, color: '#CC0000', textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  retryBtn: { backgroundColor: COLORS.brandOrange, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
});
