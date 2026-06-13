import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function getColour(score) {
  if (score >= 7) return '#CC0000';
  if (score >= 4) return '#F5A623';
  return '#27AE60';
}

function getEmoji(score) {
  if (score >= 7) return '🔴';
  if (score >= 4) return '🟡';
  return '🟢';
}

const LABEL_MAP = {
  VERY_CROWDED: 'Very Crowded',
  MODERATE:     'Moderate',
  COMFORTABLE:  'Comfortable',
};

/**
 * CrowdingBar — horizontal traffic-light bar for 1–10 crowding score.
 * Props:
 *   score  {number}  1.0–10.0
 *   label  {string}  'VERY_CROWDED' | 'MODERATE' | 'COMFORTABLE'
 */
export default function CrowdingBar({ score = 5, label = 'MODERATE' }) {
  const color = getColour(score);
  const emoji = getEmoji(score);
  const percentage = Math.min(Math.max((score / 10) * 100, 0), 100);
  const displayLabel = LABEL_MAP[label] || label;

  return (
    <View style={styles.container}>
      {/* Big score + emoji */}
      <View style={styles.scoreRow}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.score, { color }]}>{typeof score === 'number' ? score.toFixed(1) : score}</Text>
        <Text style={styles.outOf}>/10</Text>
      </View>

      {/* Progress bar track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>

      {/* Label */}
      <Text style={[styles.label, { color }]}>{displayLabel.toUpperCase()}</Text>

      {/* Scale */}
      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>Comfortable</Text>
        <Text style={styles.scaleText}>Moderate</Text>
        <Text style={styles.scaleText}>Overcrowded</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', paddingVertical: 12 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  emoji: { fontSize: 36, marginRight: 10 },
  score: { fontSize: 64, fontWeight: '900', lineHeight: 72 },
  outOf: {
    fontSize: 18,
    color: '#888888',
    fontWeight: '500',
    marginLeft: 4,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  track: {
    width: '100%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: { height: '100%', borderRadius: 7 },
  label: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  scaleText: { fontSize: 10, color: '#888888', fontWeight: '500' },
});
