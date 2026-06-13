import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';

export default function VendorDetailScreen({ route, navigation }) {
  const { vendor } = route.params;

  const getCategoryColor = (cat) => {
    switch(cat?.toUpperCase()) {
      case 'FOOD': return '#E8621A';
      case 'BEVERAGES': return '#3498DB';
      case 'SNACKS': return '#F1C40F';
      case 'BOOKS': return '#1A3557';
      case 'PHARMACY': return '#27AE60';
      default: return '#888888';
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const full = Math.round(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(<Text key={i} style={styles.starText}>{i <= full ? '★' : '☆'}</Text>);
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.card}>
          <Text style={styles.vendorName}>{vendor.name}</Text>
          <View style={[styles.badge, { backgroundColor: getCategoryColor(vendor.category) }]}>
            <Text style={styles.badgeText}>{vendor.category}</Text>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>{renderStars(vendor.average_rating)}</View>
            <Text style={styles.ratingText}>
              {vendor.average_rating ? vendor.average_rating.toFixed(1) : 'No rating'} / 5 ({vendor.review_count || 0} reviews)
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoText}>Stall {vendor.stall_number}, Platform {vendor.platform_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>🕐 {vendor.operating_hours || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>Licensed vendor #{vendor.licence_number}</Text>
          </View>

          <TouchableOpacity 
            style={styles.rateBtn} 
            activeOpacity={0.75}
            onPress={() => navigation.navigate('RateVendor', { vendor })}
          >
            <Text style={styles.rateBtnText}>Rate this Vendor</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.reportLink} 
          onPress={() => navigation.navigate('ReportHawker', { stationCode: vendor.station_code })}
        >
          <Text style={styles.reportLinkText}>Report as Unlicensed</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  card: { backgroundColor: '#FFFFFF', padding: 24, margin: 16, borderRadius: 14, elevation: 3, alignItems: 'center' },
  vendorName: { fontSize: 22, fontWeight: '700', color: '#1A3557', marginBottom: 12, textAlign: 'center' },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  ratingRow: { alignItems: 'center', marginBottom: 24 },
  stars: { flexDirection: 'row', marginBottom: 4 },
  starText: { fontSize: 24, color: '#F5A623', marginHorizontal: 2 },
  ratingText: { fontSize: 14, color: '#666' },
  infoRow: { width: '100%', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  infoText: { fontSize: 16, color: '#333' },
  rateBtn: { backgroundColor: '#E8621A', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center', marginTop: 24 },
  rateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  reportLink: { marginTop: 16, alignItems: 'center' },
  reportLinkText: { color: '#E8621A', fontSize: 14, fontWeight: '600' }
});
