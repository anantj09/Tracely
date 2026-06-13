import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import SchematicMap from './components/SchematicMap';

const STATION_SCHEMATICS = {
  NDLS: require('./data/stations/NDLS.json'),
  CSTM: require('./data/stations/CSTM.json'),
  ADI: require('./data/stations/ADI.json'),
  SBC: require('./data/stations/SBC.json'),
};

const TYPE_ICONS = {
  TOILET: '🚻', WATER: '💧', FOOD_STALL: '🍽️', MEDICAL: '➕',
  ATM: '💳', CLOAK_ROOM: '🧳', PREPAID_AUTO: '🛺',
  WAITING_ROOM: '🪑', ENQUIRY: 'ℹ️', PLATFORM_ENTRY: '🚪'
};

const AMENITY_LABELS = {
  TOILET: 'Toilet',
  WATER: 'Water',
  FOOD_STALL: 'Food Stall',
  MEDICAL: 'Medical',
  ATM: 'ATM',
  CLOAK_ROOM: 'Cloak Room',
  PREPAID_AUTO: 'Prepaid Auto',
  WAITING_ROOM: 'Waiting Room',
  ENQUIRY: 'Enquiry',
  PLATFORM_ENTRY: 'Entry Gate'
};

const STATUS_COLORS = {
  WORKING: '#27AE60', BROKEN: '#E8621A', CONFIRMED_BROKEN: '#CC0000', UNKNOWN: '#AAAAAA'
};

export default function StationSchematicScreen({ route, navigation }) {
  const { stationCode, stationName, amenities = [], vendors = [] } = route.params;
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAmenityType, setSelectedAmenityType] = useState(null);

  const stationData = STATION_SCHEMATICS[stationCode];

  if (!stationData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Station map not available</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{stationName}</Text>
        <Text style={styles.subtitle}>{amenities.length} amenities, {vendors.length} vendors</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchText}>Search Amenities & Places:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.searchScroll}
        >
          {Object.keys(TYPE_ICONS).map((type) => {
            const isSelected = selectedAmenityType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected
                ]}
                activeOpacity={0.75}
                onPress={() => setSelectedAmenityType(isSelected ? null : type)}
              >
                <Text style={styles.chipEmoji}>{TYPE_ICONS[type]}</Text>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {AMENITY_LABELS[type] || type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#27AE60'}]}/><Text style={styles.legendText}>Working</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#E8621A'}]}/><Text style={styles.legendText}>Broken</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#CC0000'}]}/><Text style={styles.legendText}>Confirmed</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#AAAAAA'}]}/><Text style={styles.legendText}>Unknown</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#1A3557', borderRadius: 2}]}/><Text style={styles.legendText}>Vendor</Text></View>
      </View>

      <View style={styles.mapContainer}>
        {amenities.length === 0 ? (
          <View style={styles.noDataOverlay}>
            <Text style={styles.noDataText}>No amenity data available yet</Text>
          </View>
        ) : null}
        <SchematicMap 
          stationData={stationData}
          amenities={amenities}
          vendors={vendors}
          selectedAmenityType={selectedAmenityType}
          onSelectAmenity={(a) => setSelectedItem({ type: 'amenity', data: a })}
          onSelectVendor={(v) => setSelectedItem({ type: 'vendor', data: v })}
        />
      </View>

      {selectedItem && (
        <View style={styles.panel}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedItem(null)}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          {selectedItem.type === 'amenity' ? (
            <View>
              <View style={styles.panelHeader}>
                <Text style={styles.panelEmoji}>{TYPE_ICONS[selectedItem.data.amenity_type] || '📍'}</Text>
                <View style={styles.panelTextContainer}>
                  <Text style={styles.panelTitle}>{selectedItem.data.label}</Text>
                  <View style={styles.badges}>
                    <View style={styles.badge}><Text style={styles.badgeText}>{selectedItem.data.amenity_type}</Text></View>
                    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[selectedItem.data.current_status] || '#AAA' }]}>
                      <Text style={[styles.badgeText, { color: '#FFF' }]}>{selectedItem.data.current_status}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AmenityDetail', { amenity: selectedItem.data })}>
                <Text style={styles.actionBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.panelHeader}>
                <Text style={styles.panelEmoji}>⭐</Text>
                <View style={styles.panelTextContainer}>
                  <Text style={styles.panelTitle}>{selectedItem.data.name}</Text>
                  <Text style={styles.panelSubtitle}>{selectedItem.data.category} • {selectedItem.data.average_rating ? selectedItem.data.average_rating.toFixed(1) : 'No'} ratings</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('VendorDetail', { vendor: selectedItem.data })}>
                <Text style={styles.actionBtnText}>View Vendor</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity 
        style={styles.reportBtn} 
        onPress={() => navigation.navigate('ReportHawker', { stationCode })}
      >
        <Text style={styles.reportBtnText}>Report Unlicensed Vendor</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#1A3557', marginBottom: 16 },
  backBtn: { backgroundColor: '#E8621A', padding: 12, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },
  header: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#DDD' },
  title: { fontSize: 20, fontWeight: '700', color: '#1A3557' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  searchContainer: { backgroundColor: '#FFFFFF', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  searchText: { fontSize: 13, fontWeight: '600', color: '#1A3557', paddingHorizontal: 16, marginBottom: 8 },
  searchScroll: { paddingHorizontal: 16, gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#FFF3EC',
    borderColor: '#E8621A',
  },
  chipEmoji: { fontSize: 14, marginRight: 6 },
  chipText: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#E8621A',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, backgroundColor: '#FFF', justifyContent: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendText: { fontSize: 10, color: '#555' },
  mapContainer: { flex: 1, position: 'relative' },
  noDataOverlay: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  noDataText: { backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, fontSize: 12 },
  panel: { position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: '#FFF', borderRadius: 14, padding: 16, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  closeBtn: { position: 'absolute', top: 8, right: 12, zIndex: 10, padding: 4 },
  closeBtnText: { fontSize: 16, color: '#888', fontWeight: 'bold' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  panelEmoji: { fontSize: 32, marginRight: 12 },
  panelTextContainer: { flex: 1 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#1A3557' },
  panelSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  badges: { flexDirection: 'row', marginTop: 6, gap: 8 },
  badge: { backgroundColor: '#E0E0E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  actionBtn: { backgroundColor: '#1A3557', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  reportBtn: { margin: 16, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E8621A', alignItems: 'center', backgroundColor: '#FFF' },
  reportBtnText: { color: '#E8621A', fontWeight: '700', fontSize: 14 }
});
