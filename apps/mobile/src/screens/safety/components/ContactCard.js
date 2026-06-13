import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { COLORS } from '../../../constants';

/**
 * ContactCard — a single trusted contact entry in TrustedContactsScreen.
 * Props:
 *   contact   {object}   — { id, name, phone }
 *   index     {number}   — 1-based display index
 *   onUpdate  {function} — (id, field, value) => void
 *   onRemove  {function} — (id) => void
 */
export default function ContactCard({ contact, index, onUpdate, onRemove }) {
  const isPhoneValid = !contact.phone || /^\d{10}$/.test(contact.phone);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.indexLabel}>Contact {index}</Text>
        <TouchableOpacity onPress={() => onRemove(contact.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Trash2 color="#CC0000" size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Name (Optional)</Text>
        <TextInput
          style={styles.input}
          value={contact.name}
          onChangeText={val => onUpdate(contact.id, 'name', val)}
          placeholder="e.g. Brother, Mother"
          placeholderTextColor={COLORS.placeholderText}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, !isPhoneValid && styles.inputError]}
          value={contact.phone}
          onChangeText={val => onUpdate(contact.id, 'phone', val.replace(/[^0-9]/g, '').substring(0, 10))}
          placeholder="10-digit mobile number"
          placeholderTextColor={COLORS.placeholderText}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {!isPhoneValid && (
          <Text style={styles.validationMsg}>Must be exactly 10 digits</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.pageWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  indexLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  required: { color: '#CC0000' },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputError: { borderColor: '#CC0000' },
  validationMsg: {
    fontSize: 11,
    color: '#CC0000',
    marginTop: 4,
    fontWeight: '500',
  },
});
