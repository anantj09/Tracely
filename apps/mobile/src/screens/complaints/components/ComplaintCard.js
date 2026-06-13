import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { COLORS } from '../../../constants';

const TYPE_CONFIG = {
  CLEANLINESS:  { icon: 'Trash2',        color: '#F57C00', label: 'Dirty Coach/Station' },
  AC_HEATING:   { icon: 'Thermometer',   color: '#1565C0', label: 'AC / Heating Issue' },
  STAFF:        { icon: 'Users',          color: '#CC0000', label: 'Staff Behaviour' },
  FOOD:         { icon: 'Utensils',       color: '#F5A623', label: 'Food Quality' },
  SAFETY:       { icon: 'ShieldAlert',    color: '#8B0000', label: 'Safety Concern' },
  OVERCROWDING: { icon: 'Users2',         color: '#7B1FA2', label: 'Overcrowding' },
  AMENITY:      { icon: 'Wrench',         color: '#757575', label: 'Broken Amenity' },
  OTHER:        { icon: 'HelpCircle',     color: '#00897B', label: 'Other' },
};

const STATUS_COLORS = {
  SUBMITTED:    { bg: '#F5F5F5', text: '#9E9E9E' },
  ACKNOWLEDGED: { bg: '#E3F2FD', text: '#1565C0' },
  IN_PROGRESS:  { bg: '#FFF3EC', text: '#E8621A' },
  RESOLVED:     { bg: '#E8F5E9', text: '#27AE60' },
  REJECTED:     { bg: '#FFEBEE', text: '#CC0000' },
};

export const timeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} min ago`;
  } else if (diffHr < 24) {
    return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
};

export default function ComplaintCard({ complaint, onPress }) {
  if (!complaint) return null;

  const typeData = TYPE_CONFIG[complaint.complaint_type] || TYPE_CONFIG.OTHER;
  const statusData = STATUS_COLORS[complaint.status] || STATUS_COLORS.SUBMITTED;
  const IconComponent = Lucide[typeData.icon] || Lucide.HelpCircle;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <View style={[styles.iconContainer, { backgroundColor: typeData.color + '15' }]}>
            <IconComponent size={20} color={typeData.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.referenceText}>{complaint.reference_number}</Text>
            <Text style={styles.typeLabel}>{typeData.label}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusData.bg }]}>
          <Text style={[styles.statusText, { color: statusData.text }]}>
            {complaint.status}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.infoGroup}>
          {complaint.train_number && (
            <Text style={styles.infoText}>Train {complaint.train_number}</Text>
          )}
          {complaint.train_number && complaint.station_code && (
            <Text style={styles.infoDot}>•</Text>
          )}
          {complaint.station_code && (
            <Text style={styles.infoText}>{complaint.station_code}</Text>
          )}
          {(complaint.train_number || complaint.station_code) && (
            <Text style={styles.infoDot}>•</Text>
          )}
          <Text style={styles.infoText}>{timeAgo(complaint.created_at)}</Text>
        </View>

        {complaint.is_reopened && (
          <View style={styles.reopenedBadge}>
            <Text style={styles.reopenedText}>Reopened</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.pageWhite || '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  referenceText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary || '#555555',
  },
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary || '#555555',
  },
  infoDot: {
    fontSize: 12,
    color: COLORS.placeholderText || '#AAAAAA',
    marginHorizontal: 6,
  },
  reopenedBadge: {
    backgroundColor: COLORS.brandOrange || '#E8621A',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  reopenedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
