import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Animated } from 'react-native';
import { useTracely } from '../../context/TracelyContext';
import { SCREENS, COLORS } from '../../constants';
import apiClient from '../../services/apiClient';
import { Clock, FileEdit, ShieldPlus, Building2, TrendingUp } from 'lucide-react-native';

export default function HomeScreen({ navigation }) {
  const { currentUser, activeJourney, refreshUser, logout, loading: contextLoading, connectionError } = useTracely();
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fadeAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (contextLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.4,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1.0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [contextLoading, fadeAnim]);

  const handleTrackPNR = async () => {
    if (pnr.length !== 10 || isNaN(pnr)) {
      setError('PNR must be exactly 10 digits.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post('/journeys/pnr', { pnr });
      const { data } = response.data;
      if (data) {
        Alert.alert('Success', 'Journey status tracked successfully!');
        await refreshUser(); // Fetch latest user details including active journey
        setPnr('');
      }
    } catch (err) {
      console.warn('Track PNR failed:', err.message);
      const isNetErr = err.code === 'ECONNABORTED' || !err.response;
      setError(isNetErr ? 'Could not connect. Check your connection.' : 'Failed to fetch PNR status. Please verify the PNR.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Banner Header */}
      <View style={styles.header}>
        <View style={styles.brandGroup}>
          <Text style={styles.logoText}>
            <Text style={styles.logoTrace}>Trace</Text>
            <Text style={styles.logoLy}>ly</Text>
          </Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>Hello, {currentUser?.name || 'Passenger'}</Text>
      </View>

      {/* PNR Search Bar */}
      <View style={styles.pnrSearchSection}>
        <View style={styles.pnrContainer}>
          <TextInput
            style={styles.pnrInput}
            keyboardType="numeric"
            maxLength={10}
            placeholder="Enter 10-digit PNR"
            placeholderTextColor={COLORS.placeholderText}
            value={pnr}
            onChangeText={(val) => {
              setPnr(val);
              if (error) setError('');
            }}
          />
          <TouchableOpacity
            style={styles.trackBtn}
            disabled={loading}
            onPress={handleTrackPNR}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.trackBtnText}>Track</Text>
            )}
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={{ width: '100%' }}>
            <Text style={styles.errorText}>{error}</Text>
            {error === 'Could not connect. Check your connection.' && (
              <TouchableOpacity style={styles.retryBtn} onPress={handleTrackPNR}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>

      {/* Feature Tiles Section */}
      <View style={styles.tilesSection}>
        <Text style={styles.sectionHeading}>Quick Services</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tilesContainer}
        >
          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigation.navigate(SCREENS.TATKAL)}
          >
            <Clock color={COLORS.brandOrange} size={24} />
            <Text style={styles.tileLabel}>Tatkal Assist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigation.navigate(SCREENS.COMPLAINTS)}
          >
            <FileEdit color={COLORS.brandOrange} size={24} />
            <Text style={styles.tileLabel}>File Grievance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigation.navigate(SCREENS.SAFETY)}
          >
            <ShieldPlus color={COLORS.brandOrange} size={24} />
            <Text style={styles.tileLabel}>Safety & SOS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigation.navigate(SCREENS.STATION)}
          >
            <Building2 color={COLORS.brandOrange} size={24} />
            <Text style={styles.tileLabel}>Station Amenities</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tile}
            onPress={() => Alert.alert('Demand Forecast', 'This feature is currently available on the Admin Dashboard.')}
          >
            <TrendingUp color={COLORS.brandOrange} size={24} />
            <Text style={styles.tileLabel}>Demand Forecast</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Active Journey Section */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionHeading}>Your Active Journey</Text>

        {connectionError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Connection Error</Text>
            <Text style={styles.errorCardText}>Could not connect. Check your connection.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshUser}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : contextLoading ? (
          <Animated.View style={[styles.journeyCard, styles.skeletonCard, { opacity: fadeAnim }]}>
            <View style={styles.skeletonLineLarge} />
            <View style={styles.skeletonLineMedium} />
            <View style={styles.skeletonLineSmall} />
          </Animated.View>
        ) : activeJourney ? (
          <View style={styles.journeyCard}>
            <View style={styles.trainRow}>
              <View>
                <Text style={styles.trainNumber}>{activeJourney.train_number}</Text>
                <Text style={styles.trainName}>{activeJourney.train_name}</Text>
              </View>
              <View style={[styles.statusBadge, activeJourney.status === 'CONFIRMED' ? styles.statusConfirmed : styles.statusWL]}>
                <Text style={styles.statusBadgeText}>{activeJourney.status}</Text>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.stationBlock}>
                <Text style={styles.stationCode}>{activeJourney.boarding_station}</Text>
                <Text style={styles.stationLabel}>Boarding</Text>
              </View>
              <View style={styles.routeArrowBlock}>
                <Text style={styles.routeArrow}>➔</Text>
              </View>
              <View style={[styles.stationBlock, { alignItems: 'flex-end' }]}>
                <Text style={styles.stationCode}>{activeJourney.destination_station}</Text>
                <Text style={styles.stationLabel}>Destination</Text>
              </View>
            </View>

            <View style={styles.detailsDivider} />

            <View style={styles.detailsRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Coach / Berth</Text>
                <Text style={styles.detailValue}>{activeJourney.coach || 'N/A'} / {activeJourney.berth || 'N/A'}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Class</Text>
                <Text style={styles.detailValue}>{activeJourney.class || 'N/A'}</Text>
              </View>
              <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.detailLabel}>Travel Date</Text>
                <Text style={styles.detailValue}>{activeJourney.travel_date}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active journey</Text>
            <Text style={styles.emptySub}>Please enter your 10-digit PNR in the tracker above to fetch your journey details.</Text>
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
  header: {
    backgroundColor: COLORS.brandNavy,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  brandGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
  },
  logoTrace: {
    color: '#FFFFFF',
  },
  logoLy: {
    color: COLORS.brandOrange,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pnrSearchSection: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  pnrContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 48,
    overflow: 'hidden',
  },
  pnrInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
  },
  trackBtn: {
    backgroundColor: COLORS.brandOrange,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '500',
  },
  tilesSection: {
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  tilesContainer: {
    paddingVertical: 8,
  },
  tile: {
    backgroundColor: '#FFFFFF',
    width: 80,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111111',
    textAlign: 'center',
    marginTop: 8,
  },
  cardSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  journeyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  trainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  trainNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brandOrange,
    marginBottom: 2,
  },
  trainName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9',
  },
  statusWL: {
    backgroundColor: '#FFF3EC',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandOrange,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stationBlock: {
    flex: 2,
  },
  stationCode: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.brandNavy,
  },
  stationLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  routeArrowBlock: {
    flex: 1,
    alignItems: 'center',
  },
  routeArrow: {
    fontSize: 20,
    color: COLORS.brandOrange,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: COLORS.dividerGrey,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#AAAAAA',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  skeletonCard: {
    backgroundColor: '#EAEAEA',
    height: 180,
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  skeletonLineLarge: {
    height: 24,
    backgroundColor: '#DDDDDD',
    borderRadius: 4,
    width: '60%',
  },
  skeletonLineMedium: {
    height: 18,
    backgroundColor: '#DDDDDD',
    borderRadius: 4,
    width: '80%',
  },
  skeletonLineSmall: {
    height: 14,
    backgroundColor: '#DDDDDD',
    borderRadius: 4,
    width: '40%',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#CC0000',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  errorCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CC0000',
    marginBottom: 6,
  },
  errorCardText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  retryBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: COLORS.brandOrange,
    borderRadius: 8,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: COLORS.brandOrange,
    fontSize: 13,
    fontWeight: '700',
  },
});

