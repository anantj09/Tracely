import React from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { COLORS } from '../../../constants';

const TYPES = [
  { code: 'CLEANLINESS', label: 'Dirty Coach/Station', icon: 'Trash2', color: '#F57C00' },
  { code: 'AC_HEATING',  label: 'AC / Heating Issue',  icon: 'Thermometer', color: '#1565C0' },
  { code: 'STAFF',       label: 'Staff Behaviour',     icon: 'Users', color: '#CC0000' },
  { code: 'FOOD',        label: 'Food Quality',        icon: 'Utensils', color: '#F5A623' },
  { code: 'SAFETY',      label: 'Safety Concern',      icon: 'ShieldAlert', color: '#8B0000' },
  { code: 'OVERCROWDING',label: 'Overcrowding',        icon: 'Users2', color: '#7B1FA2' },
  { code: 'AMENITY',     label: 'Broken Amenity',      icon: 'Wrench', color: '#757575' },
  { code: 'OTHER',       label: 'Other',               icon: 'HelpCircle', color: '#00897B' },
];

export default function ComplaintTypeSelector({ selected, onSelect }) {
  const renderItem = ({ item }) => {
    const IconComponent = Lucide[item.icon] || Lucide.HelpCircle;
    const isSelected = selected === item.code;

    return (
      <TouchableOpacity
        style={[
          styles.button,
          isSelected ? styles.selectedButton : styles.unselectedButton,
        ]}
        activeOpacity={0.75}
        onPress={() => onSelect(item.code)}
      >
        <IconComponent size={28} color={item.color} />
        <Text style={[styles.label, isSelected ? styles.selectedLabel : styles.unselectedLabel]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={TYPES}
      renderItem={renderItem}
      keyExtractor={(item) => item.code}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    height: 105,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedButton: {
    backgroundColor: '#FFF3EC',
    borderColor: COLORS.brandOrange || '#E8621A',
    borderWidth: 2,
  },
  unselectedButton: {
    backgroundColor: COLORS.pageWhite || '#FFFFFF',
    borderColor: COLORS.dividerGrey || '#E0E0E0',
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  selectedLabel: {
    color: COLORS.brandOrange || '#E8621A',
  },
  unselectedLabel: {
    color: COLORS.textPrimary || '#111111',
  },
});
