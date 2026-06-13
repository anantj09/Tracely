import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const CATEGORY_ICONS = {
  FOOD: '🍱',
  BEVERAGES: '☕',
  SNACKS: '🥨',
  BOOKS: '📚',
  PHARMACY: '💊',
};

function StarRow({ rating, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Text key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#F5A623' : '#DDDDDD' }}>
          ★
        </Text>
      ))}
    </View>
  );
}

export default function VendorCard({ vendor, onRate, onPress }) {
  const icon = CATEGORY_ICONS[vendor.category] || '🛒';
  const hasRating = vendor.average_rating > 0;
  const isFlagged = hasRating && vendor.average_rating < 3.0;
  const ratingColor = isFlagged ? '#CC0000' : vendor.average_rating >= 4 ? '#27AE60' : '#F5A623';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {isFlagged && (
        <View style={styles.flagStrip}>
          <Text style={styles.flagText}>⚠️ Low rated — flagged to station manager</Text>
        </View>
      )}
      <View style={styles.topRow}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{vendor.name}</Text>
          <Text style={styles.meta}>
            {vendor.category}
            {vendor.stall_number ? ` · Stall ${vendor.stall_number}` : ''}
            {vendor.platform_number ? ` · Pf ${vendor.platform_number}` : ''}
          </Text>
          {vendor.operating_hours ? (
            <Text style={styles.hours}>⏰ {vendor.operating_hours}</Text>
          ) : null}
        </View>
        <View style={styles.ratingBlock}>
          <Text style={[styles.ratingNum, { color: hasRating ? ratingColor : '#AAAAAA' }]}>
            {hasRating ? vendor.average_rating.toFixed(1) : 'New'}
          </Text>
          <Text style={styles.reviewCount}>({vendor.review_count || 0})</Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <StarRow rating={vendor.average_rating || 0} />
        <TouchableOpacity
          style={styles.rateBtn}
          onPress={onRate}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          activeOpacity={0.75}
        >
          <Text style={styles.rateBtnText}>Rate ›</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  flagStrip: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  flagText: { fontSize: 11, color: '#CC0000', fontWeight: '600' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingBottom: 8 },
  icon: { fontSize: 32, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1A3557', marginBottom: 3 },
  meta: { fontSize: 12, color: '#555555' },
  hours: { fontSize: 11, color: '#888888', marginTop: 3 },
  ratingBlock: { alignItems: 'center', minWidth: 44 },
  ratingNum: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  reviewCount: { fontSize: 10, color: '#888888' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
  },
  rateBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#FFF3EC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8621A',
  },
  rateBtnText: { color: '#E8621A', fontSize: 12, fontWeight: '700' },
});
