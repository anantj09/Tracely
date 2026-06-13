import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {
  Train,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react-native';
import { COLORS } from '../../constants';
import { fetchMarketplaceSurrenders, claimSurrenderTicket } from './services/tatkalService';

export default function SurrenderMarketScreen() {
  const [surrenders, setSurrenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search Filters
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [seatClass, setSeatClass] = useState('');

  // Confirmation Modal
  const [claimTarget, setClaimTarget] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [successTarget, setSuccessTarget] = useState(null);

  const loadSurrenders = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (fromStation.trim()) filters.from = fromStation.trim().toUpperCase();
      if (toStation.trim()) filters.to = toStation.trim().toUpperCase();
      if (travelDate.trim()) filters.date = travelDate.trim();
      if (seatClass.trim()) filters.class = seatClass.trim().toUpperCase();

      const response = await fetchMarketplaceSurrenders(filters);
      setSurrenders(response.data || []);
    } catch (err) {
      console.warn('Fetch marketplace surrenders failed:', err);
      setError('Could not fetch marketplace listings. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurrenders();
  }, []);

  const handleClaimRequest = (ticket) => {
    setClaimTarget(ticket);
  };

  const executeClaim = async () => {
    if (!claimTarget) return;

    setClaiming(true);
    try {
      await claimSurrenderTicket(claimTarget.id);
      setSuccessTarget(claimTarget);
      setClaimTarget(null);
      // Reload marketplace listings
      loadSurrenders();
    } catch (err) {
      console.warn('Claim surrender failed:', err);
      Alert.alert('Claim Request Failed', err.error || 'Failed to match ticket.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Search Filter Header Card */}
        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <Filter color={COLORS.brandOrange} size={18} />
            <Text style={styles.filterTitle}>Filter Listings</Text>
          </View>

          <View style={styles.filterInputsRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>From</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g. NDLS"
                placeholderTextColor={COLORS.placeholderText}
                value={fromStation}
                onChangeText={setFromStation}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>To</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g. MMCT"
                placeholderTextColor={COLORS.placeholderText}
                value={toStation}
                onChangeText={setToStation}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.filterInputsRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Travel Date</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.placeholderText}
                value={travelDate}
                onChangeText={setTravelDate}
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Class</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g. 3A, SL"
                placeholderTextColor={COLORS.placeholderText}
                value={seatClass}
                onChangeText={setSeatClass}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.searchBtn} onPress={loadSurrenders}>
            <Text style={styles.searchBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Listings Section */}
        <Text style={styles.sectionHeading}>Available Surrenders ({surrenders.length})</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brandOrange} />
            <Text style={styles.loadingText}>Searching marketplace...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <AlertCircle color="#CC0000" size={32} />
            <Text style={styles.errorTitle}>Error Loading Listings</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadSurrenders}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : surrenders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Train color={COLORS.placeholderText} size={48} />
            <Text style={styles.emptyTitle}>No Surrendered Tickets</Text>
            <Text style={styles.emptySub}>
              There are currently no listed tickets matching your criteria in the marketplace.
            </Text>
          </View>
        ) : (
          surrenders.map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={styles.trainInfo}>
                  <Train color={COLORS.brandOrange} size={20} />
                  <Text style={styles.trainName}>Train {ticket.train_number}</Text>
                </View>
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeText}>{ticket.class}</Text>
                </View>
              </View>

              <View style={styles.routeDetails}>
                <View style={styles.stationBlock}>
                  <MapPin color={COLORS.brandNavy} size={16} />
                  <Text style={styles.stationText}>{ticket.from_station}</Text>
                </View>
                <ChevronRight color="#AAAAAA" size={16} />
                <View style={styles.stationBlock}>
                  <MapPin color={COLORS.brandNavy} size={16} />
                  <Text style={styles.stationText}>{ticket.to_station}</Text>
                </View>
              </View>

              <View style={styles.dateDetails}>
                <Calendar color="#555555" size={16} />
                <Text style={styles.dateText}>Travel Date: <Text style={styles.boldText}>{ticket.travel_date}</Text></Text>
              </View>

              <TouchableOpacity
                style={styles.claimBtn}
                onPress={() => handleClaimRequest(ticket)}
              >
                <Text style={styles.claimBtnText}>Claim Ticket</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Claim Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={claimTarget !== null}
        onRequestClose={() => setClaimTarget(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <AlertCircle color={COLORS.brandOrange} size={48} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Confirm Claim Request</Text>
            
            {claimTarget && (
              <View style={styles.modalDetailsBox}>
                <Text style={styles.modalDetailsText}>
                  Train: <Text style={styles.modalBold}>{claimTarget.train_number}</Text> | Class: <Text style={styles.modalBold}>{claimTarget.class}</Text>
                </Text>
                <Text style={styles.modalDetailsText}>
                  Route: <Text style={styles.modalBold}>{claimTarget.from_station} ➔ {claimTarget.to_station}</Text>
                </Text>
                <Text style={styles.modalDetailsText}>
                  Date: <Text style={styles.modalBold}>{claimTarget.travel_date}</Text>
                </Text>
              </View>
            )}

            <Text style={styles.modalWarningText}>
              Are you sure you want to request this surrendered ticket? If matched successfully, the ticket will be transferred and linked to your passenger profile.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setClaimTarget(null)}
                disabled={claiming}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={executeClaim}
                disabled={claiming}
              >
                {claiming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Claim</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Notification Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successTarget !== null}
        onRequestClose={() => setSuccessTarget(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <CheckCircle2 color="#27AE60" size={56} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: '#27AE60' }]}>Ticket Matched Successfully!</Text>
            
            {successTarget && (
              <View style={styles.successDetailsBox}>
                <Text style={styles.successTextMain}>You have successfully claimed the ticket.</Text>
                <Text style={styles.successTextSub}>
                  Train {successTarget.train_number} ({successTarget.class}) from {successTarget.from_station} to {successTarget.to_station} on {successTarget.travel_date} has been matched.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.successCloseBtn}
              onPress={() => setSuccessTarget(null)}
            >
              <Text style={styles.successCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    padding: 16,
    flexGrow: 1,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  filterInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  searchBtn: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CC0000',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CC0000',
    marginTop: 12,
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  trainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  classBadge: {
    backgroundColor: '#FFF3EC',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandOrange,
  },
  routeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stationBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stationText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  boldText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  claimBtn: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDetailsBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    gap: 4,
  },
  modalDetailsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalBold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalWarningText: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
  },
  cancelBtnText: {
    color: '#555555',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: COLORS.brandOrange,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successDetailsBox: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTextMain: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  successTextSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  successCloseBtn: {
    backgroundColor: '#27AE60',
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
