import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Lucide from 'lucide-react-native';
import { getComplaint } from './services/complaintService';
import StatusTimeline from './components/StatusTimeline';
import { COLORS } from '../../constants';
import { timeAgo } from './components/ComplaintCard';

const TYPE_CONFIG = {
  CLEANLINESS:  { icon: 'Trash2',        color: '#F57C00', label: 'Dirty Coach/Station' },
  AC_HEATING:   { icon: 'Thermometer',   color: '#1565C0', label: 'AC / Heating Issue' },
  STAFF:        { icon: 'Users',          color: '#CC0000', label: 'Staff Behaviour' },
  FOOD:         { icon: 'Utensils',       color: '#F5A623', label: 'Food Quality' },
  SAFETY:       { icon: 'ShieldAlert',    color: '#8B0000', label: 'Safety Concern' },
  OVERCROWDING: { icon: 'Users2',         color: '#7B1FA2', label: 'Overcrowding' },
  AMENITY:      { icon: 'Wrench',         color: '#757575', label: 'Broken Amenity' },
  OTHER:        { icon: 'HelpCircle',     color: '#00897B', label: 'Other' },
};

const STATUS_COLORS = {
  SUBMITTED:    { bg: '#F5F5F5', text: '#9E9E9E' },
  ACKNOWLEDGED: { bg: '#E3F2FD', text: '#1565C0' },
  IN_PROGRESS:  { bg: '#FFF3EC', text: '#E8621A' },
  RESOLVED:     { bg: '#E8F5E9', text: '#27AE60' },
  REJECTED:     { bg: '#FFEBEE', text: '#CC0000' },
};

export default function ComplaintDetailScreen({ route, navigation }) {
  const { complaintId, showSuccess = false } = route.params || {};

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(showSuccess);
  const [showToast, setShowToast] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const fetchComplaintDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getComplaint(complaintId);
      setComplaint(result.data);
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to load details';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      fetchComplaintDetails();
    }
  }, [complaintId]);

  const handleCopyReference = async () => {
    if (complaint?.reference_number) {
      await Clipboard.setStringAsync(complaint.reference_number);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.brandOrange || '#E8621A'} />
      </View>
    );
  }

  if (error || !complaint) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Lucide.AlertCircle size={40} color="#CC0000" style={styles.errorIcon} />
          <Text style={styles.errorCardTitle}>Grievance Not Found</Text>
          <Text style={styles.errorCardText}>{error || 'The details for this complaint could not be loaded.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchComplaintDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const typeConfig = TYPE_CONFIG[complaint.complaint_type] || TYPE_CONFIG.OTHER;
  const statusConfig = STATUS_COLORS[complaint.status] || STATUS_COLORS.SUBMITTED;
  const IconComponent = Lucide[typeConfig.icon] || Lucide.HelpCircle;

  // Reopen conditions
  const isResolved = complaint.status === 'RESOLVED';
  const hasReopenDeadline = complaint.reopen_deadline ? new Date(complaint.reopen_deadline) > new Date() : false;
  const showReopenButton = isResolved && hasReopenDeadline;

  let hoursLeft = 0;
  if (showReopenButton) {
    hoursLeft = Math.floor((new Date(complaint.reopen_deadline) - new Date()) / (1000 * 60 * 60));
  }

  const hasJourneyInfo =
    complaint.train_number ||
    complaint.coach ||
    complaint.berth ||
    complaint.station_code ||
    complaint.station_name;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Banner */}
        {showSuccessBanner && (
          <View style={styles.successBanner}>
            <Lucide.CheckCircle size={22} color="#27AE60" style={styles.successIcon} />
            <View style={styles.successTextContainer}>
              <Text style={styles.successTitle}>Grievance Filed Successfully!</Text>
              <TouchableOpacity
                onPress={handleCopyReference}
                activeOpacity={0.75}
                style={styles.successRefRow}
              >
                <Text style={styles.successSubtitle}>Ref: {complaint.reference_number}</Text>
                <Lucide.Copy size={12} color="#27AE60" style={styles.miniCopyIcon} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowSuccessBanner(false)} style={styles.closeBannerBtn}>
              <Text style={styles.closeBannerText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Toast Notification */}
        {showToast && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>Reference copied!</Text>
          </View>
        )}

        {/* Complaint Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <TouchableOpacity onLongPress={handleCopyReference} activeOpacity={0.75} style={styles.refContainer}>
              <Text style={styles.refNumber}>{complaint.reference_number}</Text>
              <Text style={styles.longPressHint}>Long-press to copy</Text>
            </TouchableOpacity>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>{complaint.status}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {complaint.priority === 'CRITICAL' && (
              <View style={[styles.priorityBadge, styles.priorityCritical]}>
                <Text style={styles.priorityText}>CRITICAL</Text>
              </View>
            )}
            {complaint.priority === 'HIGH' && (
              <View style={[styles.priorityBadge, styles.priorityHigh]}>
                <Text style={styles.priorityText}>HIGH</Text>
              </View>
            )}
            <Text style={styles.filedText}>Filed {timeAgo(complaint.created_at)}</Text>
          </View>
        </View>

        {/* Category + Description Card */}
        <View style={styles.card}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryIconBox, { backgroundColor: typeConfig.color + '15' }]}>
              <IconComponent size={22} color={typeConfig.color} />
            </View>
            <Text style={styles.categoryLabel}>{typeConfig.label}</Text>
          </View>

          <Text style={styles.descriptionText}>{complaint.description}</Text>

          {complaint.photo_url && (
            <TouchableOpacity
              style={styles.thumbnailContainer}
              activeOpacity={0.75}
              onPress={() => setImageModalVisible(true)}
            >
              <Image source={{ uri: complaint.photo_url }} style={styles.thumbnail} />
              <View style={styles.expandOverlay}>
                <Lucide.Maximize2 size={16} color="#FFFFFF" />
                <Text style={styles.expandText}>Tap to zoom</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Journey Details Card */}
        {hasJourneyInfo && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Journey details</Text>
            <View style={styles.divider} />
            {complaint.train_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Train</Text>
                <Text style={styles.detailValue}>
                  {complaint.train_number} {complaint.train_name ? `— ${complaint.train_name}` : ''}
                </Text>
              </View>
            )}
            {complaint.coach && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Coach / Berth</Text>
                <Text style={styles.detailValue}>
                  {complaint.coach} {complaint.berth ? `/ ${complaint.berth}` : ''}
                </Text>
              </View>
            )}
            {complaint.station_code && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Station</Text>
                <Text style={styles.detailValue}>
                  {complaint.station_code} {complaint.station_name ? `— ${complaint.station_name}` : ''}
                </Text>
              </View>
            )}
            {complaint.travel_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Travel Date</Text>
                <Text style={styles.detailValue}>{complaint.travel_date}</Text>
              </View>
            )}
          </View>
        )}

        {/* Timeline Component */}
        <StatusTimeline timeline={complaint.timeline || []} />

        {/* Reopen Section */}
        {showReopenButton && (
          <View style={styles.reopenContainer}>
            <Text style={styles.reopenTimerText}>
              Reopen available for {hoursLeft > 0 ? `${hoursLeft} more hours` : 'less than 1 hour'}
            </Text>
            <TouchableOpacity
              style={styles.reopenBtn}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Reopen', { complaint })}
            >
              <Text style={styles.reopenBtnText}>Reopen Complaint</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Image Zoom Modal */}
      {complaint.photo_url && (
        <Modal visible={imageModalVisible} transparent={true} onRequestClose={() => setImageModalVisible(false)}>
          <View style={styles.modalBackground}>
            <SafeAreaView style={styles.modalSafeArea}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                activeOpacity={0.75}
                onPress={() => setImageModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.modalImageContainer}>
                <Image source={{ uri: complaint.photo_url }} style={styles.modalImage} resizeMode="contain" />
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
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
  successBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  successIcon: {
    marginRight: 12,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27AE60',
  },
  successRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  successSubtitle: {
    fontSize: 12,
    color: '#27AE60',
  },
  miniCopyIcon: {
    marginLeft: 6,
  },
  closeBannerBtn: {
    padding: 6,
  },
  closeBannerText: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(17, 17, 17, 0.9)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refContainer: {
    flex: 1,
  },
  refNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.brandOrange || '#E8621A',
  },
  longPressHint: {
    fontSize: 9,
    color: COLORS.placeholderText || '#AAAAAA',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  priorityBadge: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 10,
  },
  priorityCritical: {
    backgroundColor: '#FFEBEE',
  },
  priorityHigh: {
    backgroundColor: '#FFF3EC',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#CC0000',
  },
  filedText: {
    fontSize: 12,
    color: COLORS.placeholderText || '#AAAAAA',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary || '#555555',
    lineHeight: 20,
    marginBottom: 16,
  },
  thumbnailContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    height: 200,
    width: '100%',
  },
  thumbnail: {
    height: 200,
    width: '100%',
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  expandText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '600',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary || '#111111',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.dividerGrey || '#E0E0E0',
    marginVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  detailLabel: {
    width: 100,
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary || '#111111',
  },
  reopenContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  reopenTimerText: {
    fontSize: 12,
    color: COLORS.textSecondary || '#555555',
    marginBottom: 8,
  },
  reopenBtn: {
    width: '100%',
    height: 48,
    borderColor: COLORS.brandOrange || '#E8621A',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopenBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.brandOrange || '#E8621A',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalSafeArea: {
    flex: 1,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});
