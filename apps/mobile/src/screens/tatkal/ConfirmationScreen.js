import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SCREENS, COLORS } from '../../constants';
import {
  CheckCircle2,
  Train,
  MapPin,
  Calendar,
  Users,
  Home,
  ArrowRight,
} from 'lucide-react-native';

export default function ConfirmationScreen({ route, navigation }) {
  const { requestDetails } = route.params || {};

  const handleBackToHome = () => {
    // Reset the stack navigation state back to TatkalHome
    navigation.reset({
      index: 0,
      routes: [{ name: SCREENS.TATKAL_HOME || 'TatkalHome' }],
    });
  };

  if (!requestDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No booking confirmation details found.</Text>
        <TouchableOpacity style={styles.homeBtn} onPress={handleBackToHome}>
          <Text style={styles.homeBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Success Badge */}
      <View style={styles.successHeader}>
        <CheckCircle2 color="#27AE60" size={64} style={{ marginBottom: 16 }} />
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSub}>Your Tatkal ticket has been successfully booked</Text>
      </View>

      {/* PNR Card */}
      <View style={styles.pnrCard}>
        <Text style={styles.pnrLabel}>GENERATE PNR NUMBER</Text>
        <Text style={styles.pnrValue}>{requestDetails.simulated_pnr}</Text>
        <Text style={styles.pnrNotice}>Please present this PNR to the TTE during your journey</Text>
      </View>

      {/* Journey Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Journey Details</Text>
        <View style={styles.routeRow}>
          <View style={styles.stationCol}>
            <MapPin color={COLORS.brandOrange} size={16} />
            <Text style={styles.stationCode}>{requestDetails.from_station}</Text>
          </View>
          <ArrowRight color="#AAAAAA" size={18} />
          <View style={styles.stationCol}>
            <MapPin color={COLORS.brandOrange} size={16} />
            <Text style={styles.stationCode}>{requestDetails.to_station}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Calendar color="#555555" size={16} />
          <Text style={styles.detailText}>Travel Date: <Text style={styles.boldText}>{requestDetails.travel_date}</Text></Text>
        </View>

        {requestDetails.train_number && (
          <View style={styles.detailRow}>
            <Train color="#555555" size={16} />
            <Text style={styles.detailText}>
              Train Number: <Text style={styles.boldText}>{requestDetails.train_number}</Text> ({requestDetails.class})
            </Text>
          </View>
        )}
      </View>

      {/* Passengers Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Passenger List ({requestDetails.passengers?.length || 0})</Text>
        <View style={styles.passengerList}>
          {requestDetails.passengers?.map((p, idx) => (
            <View key={idx} style={styles.passengerRow}>
              <Users color={COLORS.brandOrange} size={16} style={{ marginRight: 10 }} />
              <View style={styles.passengerMeta}>
                <Text style={styles.passengerName}>{p.name}</Text>
                <Text style={styles.passengerSub}>
                  Age: {p.age} | Gender: {p.gender} | Berth: {p.berth_preference || 'ND'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleBackToHome}>
          <Home color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Back to Tatkal Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F5F5',
    paddingBottom: 40,
  },
  successHeader: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#27AE60',
  },
  successSub: {
    fontSize: 13,
    color: '#555555',
    marginTop: 6,
    textAlign: 'center',
  },
  pnrCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderRadius: 14,
    padding: 20,
    margin: 16,
    alignItems: 'center',
  },
  pnrLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#27AE60',
    letterSpacing: 1,
    marginBottom: 6,
  },
  pnrValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: 2,
  },
  pnrNotice: {
    fontSize: 11,
    color: '#2E7D32',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#555555',
  },
  boldText: {
    fontWeight: '600',
    color: '#111111',
  },
  passengerList: {
    gap: 12,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerMeta: {
    flex: 1,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  passengerSub: {
    fontSize: 12,
    color: '#555555',
    marginTop: 2,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.brandOrange,
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
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#555555',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  homeBtn: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
