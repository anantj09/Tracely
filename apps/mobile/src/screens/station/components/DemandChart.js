import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_BAR_HEIGHT = 100;

/**
 * DemandChart — simple native bar chart for demand forecast data.
 * No external charting library needed.
 *
 * Props:
 *   data   {array}   [{ label: string, count: number, isSurge: boolean }]
 *   title  {string}  chart heading (optional)
 */
export default function DemandChart({ data = [], title }) {
  if (!data.length) {
    return (
      <View style={styles.container}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.empty}>No forecast data yet</Text>
      </View>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  // Leave padding on both sides; divide remaining width among bars
  const chartWidth = SCREEN_WIDTH - 48;
  const barWidth = Math.max(Math.floor(chartWidth / data.length) - 6, 12);

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      <View style={styles.chartArea}>
        {data.map((item, i) => {
          const barHeight = Math.max(
            Math.round((item.count / maxCount) * MAX_BAR_HEIGHT),
            4
          );
          const barColor = item.isSurge ? '#CC0000' : '#E8621A';

          return (
            <View key={i} style={[styles.barGroup, { width: barWidth + 6 }]}>
              {/* Count label above bar */}
              <Text style={styles.barValue}>{item.count}</Text>
              {/* Bar itself */}
              <View
                style={[
                  styles.bar,
                  { height: barHeight, width: barWidth, backgroundColor: barColor },
                ]}
              />
              {/* Route label below bar */}
              <Text style={styles.barLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Baseline */}
      <View style={styles.baseline} />

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E8621A' }]} />
          <Text style={styles.legendLabel}>Normal intent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#CC0000' }]} />
          <Text style={styles.legendLabel}>Surge route</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3557',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  empty: {
    fontSize: 13,
    color: '#888888',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    minHeight: MAX_BAR_HEIGHT + 32,
  },
  barGroup: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 3,
  },
  barValue: { fontSize: 9, color: '#555555', marginBottom: 3 },
  bar: { borderRadius: 3, minHeight: 4 },
  barLabel: {
    fontSize: 9,
    color: '#888888',
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 12,
  },
  baseline: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
    marginHorizontal: 4,
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: '#555555' },
});
