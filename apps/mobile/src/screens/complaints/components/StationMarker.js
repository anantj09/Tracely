import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants';

export default function StationMarker({ station, onPress }) {
  if (!station) return null;

  const size = Math.min(Math.max(20, station.total_complaints * 1.5), 80);
  const color =
    station.total_complaints > 30
      ? '#CC0000'
      : station.total_complaints > 10
      ? '#E8621A'
      : '#27AE60';

  const showText = size > 35;

  return (
    <TouchableOpacity
      style={[
        styles.markerCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor: '#FFFFFF',
          borderWidth: 1.5,
        },
      ]}
      activeOpacity={0.75}
      onPress={() => onPress?.(station)}
    >
      {showText && (
        <Text style={styles.markerText} numberOfLines={1}>
          {station.station_code}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function StationBottomSheet({ station, onClose }) {
  if (!station) return null;

  // Get top 3 most common types
  const sortedTypes = Object.entries(station.by_type || {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Sparkline data (last 7 days)
  const last7Days = (station.last_30_days || []).slice(-7);
  const maxDayCount = Math.max(...last7Days, 1);

  return (
    <View style={styles.bottomSheetCard}>
      <View style={styles.bottomSheetHeader}>
        <View>
          <Text style={styles.stationTitle}>{station.station_name}</Text>
          <Text style={styles.stationSubtitle}>Code: {station.station_code}</Text>
        </View>
        {onClose && (
          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.75} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.totalComplaints}>
        {station.total_complaints} {station.total_complaints === 1 ? 'Complaint' : 'Complaints'} Total
      </Text>

      {/* Breakdown list */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Top Issues</Text>
        {sortedTypes.length > 0 ? (
          sortedTypes.map((item, idx) => (
            <View key={item.type || idx} style={styles.breakdownRow}>
              <Text style={styles.breakdownType}>{item.type}</Text>
              <Text style={styles.breakdownCount}>{item.count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No issue breakdown available.</Text>
        )}
      </View>

      {/* Sparkline */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Activity (Last 7 Days)</Text>
        <View style={styles.sparklineContainer}>
          {last7Days.map((count, idx) => {
            const barHeight = Math.max(4, (count / maxDayCount) * 40);
            return (
              <View key={idx} style={styles.sparklineBarWrapper}>
                <View style={[styles.sparklineBar, { height: barHeight }]} />
                <Text style={styles.sparklineText}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  markerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
  },
  stationSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary || '#555555',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.textSecondary || '#555555',
    fontWeight: '700',
  },
  totalComplaints: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandOrange || '#E8621A',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary || '#555555',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dividerGrey || '#E0E0E0',
  },
  breakdownType: {
    fontSize: 14,
    color: COLORS.textPrimary || '#111111',
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary || '#555555',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
    fontStyle: 'italic',
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  sparklineBarWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  sparklineBar: {
    width: 14,
    backgroundColor: COLORS.brandNavy || '#1A3557',
    borderRadius: 3,
  },
  sparklineText: {
    fontSize: 9,
    color: COLORS.textSecondary || '#555555',
    marginTop: 4,
    fontWeight: '600',
  },
});
