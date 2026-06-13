import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useTracely } from '../../context/TracelyContext';
import { SCREENS, COLORS } from '../../constants';
import {
  ArrowLeft,
  Calendar,
  Train,
  MapPin,
  Users,
  Flame,
  Fingerprint,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { getRequestDetails, triggerDemoFire, cancelRequest } from './services/tatkalService';

export default function CountdownScreen({ route, navigation }) {
  const { requestId } = route.params || {};
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [isFiring, setIsFiring] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const timerRef = useRef(null);
  const pollingRef = useRef(null);

  const fetchRequestDetails = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await getRequestDetails(requestId);
      const reqData = response.data;
      setRequest(reqData);

      // If already confirmed, navigate immediately
      if (reqData.status === 'CONFIRMED') {
        clearInterval(timerRef.current);
        clearInterval(pollingRef.current);
        navigation.replace(SCREENS.TATKAL_CONFIRMATION || 'TatkalConfirmation', {
          requestDetails: reqData,
        });
      } else if (reqData.status === 'FIRED') {
        setIsFiring(true);
      } else if (reqData.status === 'CANCELLED' || reqData.status === 'FAILED') {
        clearInterval(timerRef.current);
        clearInterval(pollingRef.current);
      }
    } catch (err) {
      console.warn('Failed to fetch request details:', err);
      setError('Failed to retrieve request details. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 1. Initial Fetch and Polling Setup
  useEffect(() => {
    if (!requestId) {
      setError('No Request ID provided.');
      setLoading(false);
      return;
    }

    fetchRequestDetails(true);

    // Poll status every 5 seconds
    pollingRef.current = setInterval(() => {
      fetchRequestDetails(false);
    }, 5000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(pollingRef.current);
    };
  }, [requestId]);

  // 2. Countdown Timer Setup
  useEffect(() => {
    if (!request || request.status !== 'PENDING') return;

    const calculateTimeRemaining = () => {
      const fireTime = new Date(request.scheduled_fire_time).getTime();
      const now = new Date().getTime();
      const diff = fireTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsFinished(true);
        clearInterval(timerRef.current);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTimeRemaining();
    timerRef.current = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timerRef.current);
  }, [request]);

  // Handle manual trigger (Demo Fire) with biometric check integration
  const handleDemoFire = async () => {
    setIsFiring(true);
    try {
      const response = await triggerDemoFire(requestId);
      const updatedReq = response.data;
      setRequest(updatedReq);

      if (updatedReq.status === 'CONFIRMED') {
        clearInterval(timerRef.current);
        clearInterval(pollingRef.current);
        // Navigate to confirmation screen
        setTimeout(() => {
          navigation.replace(SCREENS.TATKAL_CONFIRMATION || 'TatkalConfirmation', {
            requestDetails: updatedReq,
          });
        }, 1000);
      }
    } catch (err) {
      console.warn('Demo Fire failed:', err);
      Alert.alert('Simulation Failed', err.error || 'Failed to trigger booking. Please try again.');
      setIsFiring(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Prefill Request',
      'Are you sure you want to cancel this pending pre-filled request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await cancelRequest(requestId);
              Alert.alert('Cancelled', 'Your Tatkal request has been cancelled.');
              navigation.replace(SCREENS.TATKAL_HOME || 'TatkalHome');
            } catch (err) {
              Alert.alert('Error', err.error || 'Failed to cancel request.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brandOrange} />
        <Text style={styles.loadingText}>Loading booking countdown...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle color={COLORS.brandOrange} size={48} />
        <Text style={styles.errorText}>Something went wrong</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRequestDetails(true)}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!request) return null;

  // Format countdown string
  const formatNum = (num) => String(num).padStart(2, '0');
  const countdownStr = `${formatNum(timeLeft.hours)}:${formatNum(timeLeft.minutes)}:${formatNum(timeLeft.seconds)}`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Monitor</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchRequestDetails(true)}>
          <RefreshCw color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {/* Countdown Card */}
      <View style={styles.countdownSection}>
        <Text style={styles.countdownLabel}>NEXT TATKAL WINDOW OPENS IN:</Text>
        <Text style={styles.countdownDigits}>{countdownStr}</Text>
        <Text style={styles.countdownSubLabel}>HH : MM : SS</Text>
        <Text style={styles.countdownHelpText}>
          {request.class === 'SL' || request.class === 'GEN'
            ? 'Sleeper/General window opens at 11:00 AM IST'
            : 'AC Classes window opens at 10:00 AM IST'}
        </Text>
      </View>

      {/* Firing Overlay/Status Card */}
      {isFiring && (
        <View style={styles.firingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.firingText}>Firing pre-fill request to IRCTC gateway...</Text>
        </View>
      )}

      {/* Journey details Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Journey Details</Text>
        <View style={styles.routeRow}>
          <View style={styles.stationCol}>
            <MapPin color={COLORS.brandOrange} size={16} />
            <Text style={styles.stationCode}>{request.from_station}</Text>
          </View>
          <View style={styles.arrowCol}>
            <View style={styles.arrowLine} />
            <Text style={styles.classBadge}>{request.class}</Text>
          </View>
          <View style={styles.stationCol}>
            <MapPin color={COLORS.brandOrange} size={16} />
            <Text style={styles.stationCode}>{request.to_station}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Calendar color="#555555" size={16} />
          <Text style={styles.detailText}>Travel Date: <Text style={styles.boldText}>{request.travel_date}</Text></Text>
        </View>

        {request.train_number && (
          <View style={styles.detailRow}>
            <Train color="#555555" size={16} />
            <Text style={styles.detailText}>Train Number: <Text style={styles.boldText}>{request.train_number}</Text></Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Users color="#555555" size={16} />
          <Text style={styles.detailText}>Passengers: <Text style={styles.boldText}>{request.passengers?.length || 0}</Text></Text>
        </View>

        {request.is_urgent && (
          <View style={[styles.detailRow, styles.urgencyRow]}>
            <Flame color={COLORS.brandOrange} size={16} />
            <Text style={[styles.detailText, { color: COLORS.brandOrange, fontWeight: '700' }]}>
              URGENCY PRIORITY LEVEL: {request.urgency_score?.toFixed(1) || '0.0'}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {request.status === 'PENDING' && (
          <>
            <TouchableOpacity
              style={[styles.fireBtn, isFiring ? styles.disabledBtn : null]}
              onPress={handleDemoFire}
              disabled={isFiring}
            >
              <Fingerprint color="#FFFFFF" size={20} style={styles.btnIcon} />
              <Text style={styles.fireBtnText}>
                {isFiring ? 'Verifying & Firing...' : 'Simulate Demo Fire'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, isCancelling ? styles.disabledBtn : null]}
              onPress={handleCancelRequest}
              disabled={isCancelling}
            >
              <Text style={styles.cancelBtnText}>
                {isCancelling ? 'Cancelling...' : 'Cancel Request'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {request.status === 'CANCELLED' && (
          <View style={styles.statusBoxCancelled}>
            <Text style={styles.statusBoxText}>This request was cancelled.</Text>
          </View>
        )}

        {request.status === 'FAILED' && (
          <View style={styles.statusBoxFailed}>
            <Text style={styles.statusBoxText}>Booking failed. Window expired or seat unavailable.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

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
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 4,
  },
  refreshBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  countdownSection: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
    marginBottom: 12,
  },
  countdownDigits: {
    fontSize: 52,
    fontWeight: '700',
    color: COLORS.brandOrange,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  countdownSubLabel: {
    fontSize: 11,
    color: '#777777',
    marginTop: 4,
    letterSpacing: 4,
  },
  countdownHelpText: {
    fontSize: 12,
    color: '#555555',
    marginTop: 16,
    fontStyle: 'italic',
  },
  firingBanner: {
    backgroundColor: COLORS.brandOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  firingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    margin: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stationCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stationCode: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.brandNavy,
  },
  arrowCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 12,
  },
  arrowLine: {
    height: 1.5,
    backgroundColor: '#E0E0E0',
    width: '100%',
    position: 'absolute',
  },
  classBadge: {
    backgroundColor: '#FFF3EC',
    borderWidth: 1,
    borderColor: COLORS.brandOrange,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandOrange,
    zIndex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 6,
  },
  urgencyRow: {
    backgroundColor: '#FFF3EC',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#555555',
  },
  boldText: {
    fontWeight: '600',
    color: '#111111',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 12,
  },
  fireBtn: {
    backgroundColor: '#E8621A',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fireBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 8,
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CC0000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#CC0000',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  statusBoxCancelled: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statusBoxFailed: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statusBoxText: {
    color: '#555555',
    fontSize: 14,
    fontWeight: '600',
  },
});
