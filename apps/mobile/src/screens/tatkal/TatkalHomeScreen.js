import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTracely } from '../../context/TracelyContext';
import { SCREENS, COLORS } from '../../constants';
import {
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Lock,
  AlertTriangle,
  UserCheck,
  Ticket
} from 'lucide-react-native';
import { getMyActiveLocks, getMyRequests } from './services/tatkalService';
import IrctcSignupModal from './components/IrctcSignupModal';

export default function TatkalHomeScreen({ navigation }) {
  const { currentUser, refreshUser } = useTracely();
  const [locks, setLocks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locksExpanded, setLocksExpanded] = useState(true);
  const [requestsExpanded, setRequestsExpanded] = useState(true);

  // IRCTC Signup Modal state
  const [modalVisible, setModalVisible] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [locksData, requestsData] = await Promise.all([
        getMyActiveLocks(),
        getMyRequests()
      ]);
      setLocks(locksData.data || []);
      setRequests(requestsData.data || []);
    } catch (err) {
      console.warn('Fetch Tatkal details failed:', err);
      setError('Failed to fetch active passenger locks or bookings. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Defer execution to avoid calling setState synchronously within the effect body
    Promise.resolve().then(() => {
      fetchData();
    });
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleIrctcSuccess = async () => {
    setModalVisible(false);
    await refreshUser();
    fetchData();
  };

  if (loading && locks.length === 0 && requests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brandOrange} />
        <Text style={styles.loadingText}>Fetching Tatkal details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle color={COLORS.brandOrange} size={48} />
        <Text style={styles.errorText}>Something went wrong</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isVerified = currentUser?.is_verified === true;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
        <Clock color="#FFFFFF" size={32} />
        <Text style={styles.headerTitle}>Tatkal Assist Dashboard</Text>
        <Text style={styles.headerSub}>Manage your bookings, locks, and synced passenger profiles</Text>
      </View>

      {/* Verification Banner */}
      {!isVerified && (
        <TouchableOpacity
          style={styles.verificationBanner}
          onPress={() => setModalVisible(true)}
        >
          <ShieldAlert color="#FFFFFF" size={20} />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Sync IRCTC Account</Text>
            <Text style={styles.bannerText}>Your profile lacks synchronized verification. Tap here to link credentials.</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Verified Status Banner */}
      {isVerified && (
        <View style={styles.verifiedBanner}>
          <UserCheck color="#FFFFFF" size={20} />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Account Profile Sync Active</Text>
            <Text style={styles.verifiedBannerText}>Official IRCTC credentials linked. Ready for auto-fill booking.</Text>
          </View>
        </View>
      )}

      {/* Quick Action CTAs */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate(SCREENS.TATKAL_PREFILL)}
        >
          <Clock color="#FFFFFF" size={20} style={styles.btnIcon} />
          <Text style={styles.primaryBtnText}>Create Prefill Booking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate(SCREENS.TATKAL_SURRENDER_MARKET)}
        >
          <Text style={styles.secondaryBtnText}>Surrender Ticket Marketplace</Text>
        </TouchableOpacity>
      </View>

      {/* Collapsible locks Accordion */}
      <View style={styles.locksSection}>
        <TouchableOpacity
          style={styles.locksHeader}
          onPress={() => setLocksExpanded(!locksExpanded)}
        >
          <View style={styles.locksTitleRow}>
            <Lock color={COLORS.brandNavy} size={20} />
            <Text style={styles.locksTitle}>Active Journey Locks ({locks.length})</Text>
          </View>
          {locksExpanded ? <ChevronUp color="#555555" size={20} /> : <ChevronDown color="#555555" size={20} />}
        </TouchableOpacity>

        {locksExpanded && (
          <View style={styles.locksContent}>
            {locks.length === 0 ? (
              <View style={styles.emptyLocksCard}>
                <Text style={styles.emptyLocksText}>No active journey locks.</Text>
                <Text style={styles.emptyLocksSub}>Your passenger profiles are free to book any travel intent.</Text>
              </View>
            ) : (
              locks.map((lock) => (
                <View key={lock.lock_id} style={styles.lockCard}>
                  <View style={styles.lockCardHeader}>
                    <Text style={styles.lockPassenger}>{lock.passenger_name}</Text>
                    <View style={styles.lockBadge}>
                      <Lock color="#CC0000" size={12} />
                      <Text style={styles.lockBadgeText}>LOCKED</Text>
                    </View>
                  </View>

                  <View style={styles.lockDetails}>
                    <Text style={styles.lockText}>PNR: <Text style={styles.boldText}>{lock.pnr}</Text></Text>
                    <Text style={styles.lockText}>Train: <Text style={styles.boldText}>{lock.train_number}</Text> ({lock.class})</Text>
                    <Text style={styles.lockText}>Route: <Text style={styles.boldText}>{lock.from_station} ➔ {lock.to_station}</Text></Text>
                    <Text style={styles.lockText}>Duration: <Text style={styles.boldText}>{lock.travel_date}</Text></Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Collapsible Bookings Accordion */}
      <View style={styles.locksSection}>
        <TouchableOpacity
          style={styles.locksHeader}
          onPress={() => setRequestsExpanded(!requestsExpanded)}
        >
          <View style={styles.locksTitleRow}>
            <Ticket color={COLORS.brandNavy} size={20} />
            <Text style={styles.locksTitle}>My Tatkal Bookings ({requests.length})</Text>
          </View>
          {requestsExpanded ? <ChevronUp color="#555555" size={20} /> : <ChevronDown color="#555555" size={20} />}
        </TouchableOpacity>

        {requestsExpanded && (
          <View style={styles.locksContent}>
            {requests.length === 0 ? (
              <View style={styles.emptyLocksCard}>
                <Text style={styles.emptyLocksText}>No prefill bookings registered.</Text>
                <Text style={styles.emptyLocksSub}>Create a prefill booking request to automate your Tatkal ticketing.</Text>
              </View>
            ) : (
              requests.map((req) => (
                <View key={req.id} style={styles.lockCard}>
                  <View style={styles.lockCardHeader}>
                    <Text style={styles.lockPassenger}>Train: {req.train_number} ({req.class})</Text>
                    <View style={[styles.statusBadge, getStatusBadgeStyle(req.status)]}>
                      <Text style={[styles.statusBadgeText, getStatusBadgeTextStyle(req.status)]}>{req.status}</Text>
                    </View>
                  </View>

                  <View style={styles.lockDetails}>
                    <Text style={styles.lockText}>Route: <Text style={styles.boldText}>{req.from_station} ➔ {req.to_station}</Text></Text>
                    <Text style={styles.lockText}>Date: <Text style={styles.boldText}>{req.travel_date}</Text></Text>
                    <Text style={styles.lockText}>Passengers: <Text style={styles.boldText}>{req.passengers?.map(p => p.name).join(', ')}</Text></Text>
                    {req.simulated_pnr && (
                      <Text style={styles.lockText}>PNR: <Text style={styles.boldText}>{req.simulated_pnr}</Text></Text>
                    )}
                    {req.is_urgent && (
                      <Text style={styles.lockText}>Urgency Score: <Text style={[styles.boldText, { color: COLORS.brandOrange }]}>{req.urgency_score}</Text></Text>
                    )}
                  </View>

                  <View style={styles.reqActionRow}>
                    {(req.status === 'PENDING' || req.status === 'FIRED') && (
                      <TouchableOpacity
                        style={styles.actionBtnPrimary}
                        onPress={() => navigation.navigate(SCREENS.TATKAL_COUNTDOWN || 'TatkalCountdown', { requestId: req.id })}
                      >
                        <Text style={styles.actionBtnTextPrimary}>Monitor Countdown</Text>
                      </TouchableOpacity>
                    )}
                    {req.status === 'CONFIRMED' && (
                      <TouchableOpacity
                        style={styles.actionBtnSuccess}
                        onPress={() => navigation.navigate(SCREENS.TATKAL_CONFIRMATION || 'TatkalConfirmation', { requestDetails: req })}
                      >
                        <Text style={styles.actionBtnTextSuccess}>View Ticket</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* IRCTC Profile Sync Modal */}
      <IrctcSignupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleIrctcSuccess}
      />
    </ScrollView>
  );
}

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'CONFIRMED':
      return { backgroundColor: '#E8F5E9' };
    case 'PENDING':
      return { backgroundColor: '#E3F2FD' };
    case 'FIRED':
      return { backgroundColor: '#FFF3E0' };
    case 'CANCELLED':
      return { backgroundColor: '#ECEFF1' };
    case 'FAILED':
      return { backgroundColor: '#FFEBEE' };
    default:
      return { backgroundColor: '#F5F5F5' };
  }
};

const getStatusBadgeTextStyle = (status) => {
  switch (status) {
    case 'CONFIRMED':
      return { color: '#27AE60' };
    case 'PENDING':
      return { color: '#2F80ED' };
    case 'FIRED':
      return { color: '#E8621A' };
    case 'CANCELLED':
      return { color: '#777777' };
    case 'FAILED':
      return { color: '#EB5757' };
    default:
      return { color: '#777777' };
  }
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    backgroundColor: COLORS.brandNavy,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  verificationBanner: {
    backgroundColor: COLORS.brandOrange,
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  verifiedBanner: {
    backgroundColor: '#27AE60',
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    lineHeight: 16,
  },
  verifiedBannerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 2,
    lineHeight: 16,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  btnIcon: {
    marginRight: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.brandOrange,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.brandOrange,
    fontSize: 14,
    fontWeight: '700',
  },
  locksSection: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  locksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  locksTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  locksContent: {
    padding: 16,
  },
  emptyLocksCard: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyLocksText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyLocksSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  lockCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  lockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockPassenger: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  lockBadgeText: {
    color: '#CC0000',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 4,
  },
  lockDetails: {
    gap: 4,
  },
  lockText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  boldText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  sectionSubTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  infoHelpText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 15,
  },
  passengerListContainer: {
    marginBottom: 16,
  },
  passengerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3EC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  passengerBadgeInfo: {
    flex: 1,
  },
  passengerBadgeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandOrange,
  },
  passengerBadgeSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noPassengersText: {
    fontSize: 12,
    color: COLORS.placeholderText,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  addPassengerBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    marginBottom: 20,
  },
  addPassengerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  passengerInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  selectorGroup: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#FFF3EC',
    borderColor: COLORS.brandOrange,
  },
  genderBtnText: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '500',
  },
  genderBtnTextActive: {
    color: COLORS.brandOrange,
    fontWeight: '700',
  },
  berthScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  berthBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  berthBtnActive: {
    backgroundColor: '#FFF3EC',
    borderColor: COLORS.brandOrange,
  },
  berthBtnText: {
    fontSize: 10,
    color: '#555555',
    fontWeight: '600',
  },
  berthBtnTextActive: {
    color: COLORS.brandOrange,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: COLORS.brandNavy,
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  linkSubmitBtn: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  linkSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reqActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.brandOrange,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSuccess: {
    backgroundColor: '#27AE60',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextSuccess: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
