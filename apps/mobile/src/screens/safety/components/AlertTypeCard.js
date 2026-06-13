import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants';

/**
 * AlertTypeCard — a selectable radio-style card for incident/hazard type selection.
 * Props:
 *   id         {string}   — unique identifier
 *   label      {string}   — display label
 *   isSelected {boolean}  — whether this card is currently selected
 *   onSelect   {function} — called with id when tapped
 *   color      {string}   — optional accent color (defaults to brandOrange)
 */
export default function AlertTypeCard({ id, label, isSelected, onSelect, color }) {
  const accentColor = color || COLORS.brandOrange;

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && { borderColor: accentColor, backgroundColor: accentColor + '10' }]}
      onPress={() => onSelect(id)}
      activeOpacity={0.75}
    >
      <View style={[styles.radio, { borderColor: accentColor }]}>
        {isSelected && <View style={[styles.radioFill, { backgroundColor: accentColor }]} />}
      </View>
      <Text style={[styles.label, isSelected && { color: accentColor, fontWeight: '700' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pageWhite,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
});
