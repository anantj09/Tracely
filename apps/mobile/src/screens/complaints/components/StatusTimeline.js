import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants';
import { timeAgo } from './ComplaintCard';

const STATUS_COLORS = {
  SUBMITTED:    { bg: '#F5F5F5', text: '#9E9E9E' },
  ACKNOWLEDGED: { bg: '#E3F2FD', text: '#1565C0' },
  IN_PROGRESS:  { bg: '#FFF3EC', text: '#E8621A' },
  RESOLVED:     { bg: '#E8F5E9', text: '#27AE60' },
  REJECTED:     { bg: '#FFEBEE', text: '#CC0000' },
};

export default function StatusTimeline({ timeline = [] }) {
  const [oldestFirst, setOldestFirst] = useState(true);

  if (!timeline || timeline.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No timeline events recorded.</Text>
      </View>
    );
  }

  // Find the overall mathematically most recent item
  const mostRecentItem = timeline.reduce((latest, current) => {
    if (!latest) return current;
    return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
  }, null);

  const sortedTimeline = [...timeline].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return oldestFirst ? timeA - timeB : timeB - timeA;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History Log</Text>
        <TouchableOpacity
          style={styles.toggleBtn}
          activeOpacity={0.75}
          onPress={() => setOldestFirst(!oldestFirst)}
        >
          <Text style={styles.toggleBtnText}>
            {oldestFirst ? 'Show Newest First' : 'Show Oldest First'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {sortedTimeline.map((item, index) => {
          const isMostRecent = item.id === mostRecentItem?.id;
          const statusConfig = STATUS_COLORS[item.to_status] || STATUS_COLORS.SUBMITTED;
          const isLastItem = index === sortedTimeline.length - 1;

          // Format changed_by text
          let actorText = '';
          if (item.changed_by) {
            const actor = item.changed_by.toLowerCase();
            if (actor === 'user') actorText = 'by You';
            else if (actor === 'admin') actorText = 'by Admin';
            else if (actor === 'system') actorText = 'by System';
            else actorText = `by ${item.changed_by}`;
          }

          return (
            <View key={item.id || index} style={styles.timelineItem}>
              {/* Left timeline line and dot */}
              <View style={styles.leftColumn}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: statusConfig.text,
                      width: isMostRecent ? 16 : 12,
                      height: isMostRecent ? 16 : 12,
                      borderRadius: isMostRecent ? 8 : 6,
                    },
                  ]}
                />
                {!isLastItem && <View style={styles.line} />}
              </View>

              {/* Right content details */}
              <View style={styles.rightColumn}>
                <View style={styles.metaRow}>
                  <View style={[styles.statusChip, { backgroundColor: statusConfig.bg }]}>
                    <Text
                      style={[
                        styles.statusChipText,
                        {
                          color: statusConfig.text,
                          fontWeight: isMostRecent ? '700' : '600',
                        },
                      ]}
                    >
                      {item.to_status}
                    </Text>
                  </View>
                  {actorText ? <Text style={styles.actorText}>{actorText}</Text> : null}
                  <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
                </View>

                {item.note ? (
                  <View style={styles.noteContainer}>
                    <Text style={styles.noteText}>{item.note}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.pageWhite || '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dividerGrey || '#E0E0E0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
  },
  toggleBtn: {
    backgroundColor: '#FFF3EC',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  toggleBtnText: {
    fontSize: 12,
    color: COLORS.brandOrange || '#E8621A',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary || '#555555',
    fontSize: 14,
  },
  listContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: 16,
    width: 16,
  },
  dot: {
    zIndex: 1,
    marginTop: 4,
  },
  line: {
    width: 2,
    backgroundColor: COLORS.dividerGrey || '#E0E0E0',
    position: 'absolute',
    top: 16,
    bottom: 0,
    left: 7, // center of the column
  },
  rightColumn: {
    flex: 1,
    paddingBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  statusChip: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  statusChipText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  actorText: {
    fontSize: 12,
    color: COLORS.textSecondary || '#555555',
    marginRight: 8,
    fontStyle: 'italic',
  },
  timeText: {
    fontSize: 11,
    color: COLORS.placeholderText || '#AAAAAA',
    marginLeft: 'auto',
  },
  noteContainer: {
    backgroundColor: COLORS.surfaceGrey || '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
    lineHeight: 18,
  },
});
