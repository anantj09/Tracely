import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert as AlertNative, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { getContacts, addContact, deleteContact } from './services/safetyService';
import ContactCard from './components/ContactCard';

const Alert = {
  alert: (title, message, buttons) => {
    if (Platform.OS === 'web') {
      const formattedMessage = title ? `${title}\n\n${message}` : message;
      if (buttons && buttons.length > 1) {
        // This is a confirmation dialog (e.g. Delete Contact)
        const confirmed = window.confirm(formattedMessage);
        if (confirmed) {
          const okButton = buttons.find(b => b.text === 'Delete' || b.text === 'OK' || b.text === 'Yes') || buttons[1];
          if (okButton && typeof okButton.onPress === 'function') {
            okButton.onPress();
          }
        } else {
          const cancelButton = buttons.find(b => b.style === 'cancel' || b.text === 'Cancel') || buttons[0];
          if (cancelButton && typeof cancelButton.onPress === 'function') {
            cancelButton.onPress();
          }
        }
      } else {
        // Single OK button dialog
        window.alert(formattedMessage);
        if (buttons && buttons.length > 0) {
          const primaryButton = buttons[0];
          if (primaryButton && typeof primaryButton.onPress === 'function') {
            primaryButton.onPress();
          }
        }
      }
    } else {
      AlertNative.alert(title, message, buttons);
    }
  }
};

export default function TrustedContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchContacts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await getContacts();
      const list = response?.data?.data || response?.data || [];
      setContacts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load contacts:', error.message);
      Alert.alert('Error', 'Could not load emergency contacts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (active) {
      Promise.resolve().then(() => {
        fetchContacts();
      });
    }
    return () => { active = false; };
  }, []);

  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter both name and phone number.');
      return;
    }

    // Basic 10-digit numeric phone validation
    const cleanPhone = newPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      Alert.alert('Validation Error', 'Please enter a valid phone number (10 to 15 digits).');
      return;
    }

    setSubmitting(true);
    try {
      const response = await addContact({ name: newName.trim(), phone: cleanPhone });
      const added = response?.data?.data || response?.data || {};
      
      setContacts((prev) => [...prev, added]);
      setNewName('');
      setNewPhone('');
      Alert.alert('Success', 'Trusted contact added successfully.');
    } catch (error) {
      console.error('Failed to add contact:', error.message);
      Alert.alert('Error', 'Failed to save trusted contact.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = (id, name) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${name} from your trusted contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(id);
              setContacts((prev) => prev.filter((c) => c.id !== id));
            } catch (error) {
              console.error('Failed to delete contact:', error.message);
              Alert.alert('Error', 'Failed to delete trusted contact.');
            }
          }
        }
      ]
    );
  };

  const handleUpdateContact = (id, field, value) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const renderContactItem = ({ item, index }) => (
    <ContactCard
      contact={item}
      index={index + 1}
      onUpdate={handleUpdateContact}
      onRemove={(id) => handleDeleteContact(id, item.name)}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        
        {/* Top Add Contact Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Emergency Contact</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Contact Name"
            placeholderTextColor="#7B8A9E"
            value={newName}
            onChangeText={setNewName}
            maxLength={50}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#7B8A9E"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
            maxLength={15}
          />

          <TouchableOpacity
            style={[styles.addButton, submitting && styles.buttonDisabled]}
            onPress={handleAddContact}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.addButtonText}>Add Trusted Contact</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Contacts List */}
        <View style={styles.listContainer}>
          <Text style={styles.listSectionTitle}>Your Trusted Network ({contacts.length})</Text>
          
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#E8621A" />
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              renderItem={renderContactItem}
              contentContainerStyle={styles.listContent}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchContacts(true);
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No contacts added yet</Text>
                  <Text style={styles.emptySub}>
                    Contacts listed here will be sent an automated SOS alert containing your PNR and GPS location during an emergency.
                  </Text>
                </View>
              }
            />
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A3557',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1A3557',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#E8621A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    elevation: 2,
    shadowColor: '#E8621A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContainer: {
    flex: 1,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A3557',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardInfo: {
    gap: 4,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3557',
  },
  contactPhone: {
    fontSize: 12,
    color: '#7B8A9E',
    fontWeight: '600',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7B8A9E',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
});
