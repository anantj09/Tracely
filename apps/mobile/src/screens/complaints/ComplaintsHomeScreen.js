import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as Lucide from 'lucide-react-native';
import { useComplaints } from './hooks/useComplaints';
import ComplaintCard from './components/ComplaintCard';
import { COLORS } from '../../constants';

const FILTER_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
];

export default function ComplaintsHomeScreen({ navigation }) {
  const { complaints, loading, error, refresh, filters, setFilters } = useComplaints();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Complaints',
      headerLeft: null,
    });
  }, [navigation]);

  const activeStatus = filters.status || null;

  const handleSelectFilter = (status) => {
    setFilters(status ? { status } : {});
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Text style={styles.title}>My Complaints</Text>
      <Text style={styles.subtitle}>Track and manage your grievances</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('NewComplaint')}
        >
          <Text style={styles.primaryBtnText}>+ New Complaint</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('PublicHeatMap')}
        >
          <Text style={styles.outlineBtnText}>🗺 Public Map</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeStatus === opt.value;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.filterChip,
                  isActive ? styles.activeChip : styles.inactiveChip,
                ]}
                activeOpacity={0.75}
                onPress={() => handleSelectFilter(opt.value)}
              >
                <Text style={[styles.chipText, isActive ? styles.activeChipText : styles.inactiveChipText]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const renderListEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brandOrange || '#E8621A'} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorCard}>
          <Lucide.AlertTriangle size={36} color="#CC0000" style={styles.errorIcon} />
          <Text style={styles.errorCardTitle}>Error Loading Complaints</Text>
          <Text style={styles.errorCardText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Lucide.FileEdit size={48} color="#CCCCCC" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>No complaints yet</Text>
        <Text style={styles.emptySubtitle}>Tap 'New Complaint' to report an issue.</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={loading && complaints.length === 0 ? [] : complaints}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <ComplaintCard
            complaint={item}
            onPress={() => navigation.navigate('ComplaintDetail', { complaintId: item.id })}
          />
        </View>
      )}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderListEmpty}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={loading && complaints.length > 0}
          onRefresh={refresh}
          colors={[COLORS.brandOrange || '#E8621A']}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    backgroundColor: '#F5F5F5',
    paddingBottom: 24,
  },
  headerSection: {
    paddingTop: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary || '#555555',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.brandOrange || '#E8621A',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  outlineBtn: {
    flex: 0.6,
    borderColor: COLORS.brandOrange || '#E8621A',
    borderWidth: 1.5,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineBtnText: {
    color: COLORS.brandOrange || '#E8621A',
    fontWeight: '700',
    fontSize: 14,
  },
  filterWrapper: {
    marginBottom: 16,
  },
  filterChipsRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeChip: {
    backgroundColor: COLORS.brandOrange || '#E8621A',
    borderColor: COLORS.brandOrange || '#E8621A',
  },
  inactiveChip: {
    backgroundColor: COLORS.pageWhite || '#FFFFFF',
    borderColor: COLORS.dividerGrey || '#E0E0E0',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  inactiveChipText: {
    color: COLORS.textSecondary || '#555555',
  },
  cardWrapper: {
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary || '#555555',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    marginHorizontal: 20,
    marginVertical: 40,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CC0000',
    marginBottom: 8,
  },
  errorCardText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: COLORS.brandOrange || '#E8621A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
