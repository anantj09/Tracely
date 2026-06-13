import { useState, useEffect } from 'react';

const STATUS_COLORS = {
  SUBMITTED: { bg: '#F5F5F5', text: '#9E9E9E' },
  ACKNOWLEDGED: { bg: '#E3F2FD', text: '#1565C0' },
  IN_PROGRESS: { bg: '#FFF3EC', text: '#E8621A' },
  RESOLVED: { bg: '#E8F5E9', text: '#27AE60' },
  REJECTED: { bg: '#FFEBEE', text: '#CC0000' },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function RecentGrievancesSidebar({ refreshTrigger }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detail Modal States
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Reopen Action States
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenSubmitting, setReopenSubmitting] = useState(false);
  const [reopenError, setReopenError] = useState('');

  const token = localStorage.getItem('tracely_token') || localStorage.getItem('token');
  const isLoggedIn = !!token;

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchGrievances = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/complaints`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to retrieve recent grievances');
        }
        const result = await response.json();
        setComplaints((result.data || []).slice(0, 10));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrievances();
  }, [isLoggedIn, token, refreshTrigger]);

  const fetchComplaintDetails = async (id) => {
    setSelectedComplaintId(id);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    setShowReopenForm(false);
    setReopenReason('');
    setReopenError('');

    try {
      const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch complaint details');
      }
      const result = await response.json();
      setDetailData(result.data);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim() || reopenReason.trim().length < 20) {
      setReopenError('Please enter a reason with at least 20 characters');
      return;
    }

    setReopenSubmitting(true);
    setReopenError('');

    try {
      const response = await fetch(`${API_BASE_URL}/complaints/${selectedComplaintId}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description: reopenReason.trim() })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reopen grievance');
      }

      // Re-fetch details to show updated status/timeline
      await fetchComplaintDetails(selectedComplaintId);

      // Also refresh sidebar list of complaints
      if (token) {
        const listResponse = await fetch(`${API_BASE_URL}/complaints`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (listResponse.ok) {
          const listResult = await listResponse.json();
          setComplaints((listResult.data || []).slice(0, 10));
        }
      }
    } catch (err) {
      setReopenError(err.message);
    } finally {
      setReopenSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.card}>
        <h3 style={styles.title}>Recent Grievances</h3>
        <div style={styles.loginPrompt}>
          <span style={styles.lockIcon}>🔒</span>
          <p style={styles.promptText}>Log in to see your recent grievances.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Recent Grievances</h3>
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : (error || complaints.length === 0) ? (
        <p style={styles.emptyText}>No recent grievances filed.</p>
      ) : (
        <ul style={styles.list}>
          {complaints.map((item) => {
            const statusConfig = STATUS_COLORS[item.status] || STATUS_COLORS.SUBMITTED;
            return (
              <li
                key={item.id}
                style={{ ...styles.item, cursor: 'pointer' }}
                onClick={() => fetchComplaintDetails(item.id)}
              >
                <div style={styles.itemHeader}>
                  <span style={styles.refNumber}>{item.reference_number}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.text,
                    }}
                  >
                    {item.status}
                  </span>
                </div>
                <div style={styles.itemDetails}>
                  <span>{item.complaint_type}</span>
                  <span style={styles.date}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Detail Modal */}
      {selectedComplaintId && (
        <div style={styles.modalOverlay} onClick={() => setSelectedComplaintId(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h4 style={styles.modalTitle}>Grievance Details</h4>
              <button style={styles.closeBtn} onClick={() => setSelectedComplaintId(null)}>✕</button>
            </div>

            {detailLoading ? (
              <div style={styles.modalLoading}>
                <div style={styles.spinner}></div>
                <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading details...</p>
              </div>
            ) : detailError ? (
              <div style={styles.modalError}>
                <span>⚠️ {detailError}</span>
              </div>
            ) : detailData ? (
              <div style={styles.modalBody}>
                {/* Status and Ref Number */}
                <div style={styles.row}>
                  <div style={styles.col}>
                    <span style={styles.detailLabel}>Reference Number</span>
                    <span style={styles.detailValPrimary}>{detailData.reference_number}</span>
                  </div>
                  <div style={styles.col}>
                    <span style={styles.detailLabel}>Status</span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: (STATUS_COLORS[detailData.status] || STATUS_COLORS.SUBMITTED).bg,
                      color: (STATUS_COLORS[detailData.status] || STATUS_COLORS.SUBMITTED).text,
                      padding: '4px 8px',
                      fontSize: '11px',
                    }}>
                      {detailData.status}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div style={styles.detailGrid}>
                  <div>
                    <span style={styles.detailLabel}>Category</span>
                    <span style={styles.detailVal}>{detailData.complaint_type}</span>
                  </div>
                  <div>
                    <span style={styles.detailLabel}>Priority</span>
                    <span style={{
                      ...styles.detailVal,
                      color: detailData.priority === 'CRITICAL' ? '#CC0000' : detailData.priority === 'HIGH' ? '#E8621A' : '#555555',
                      fontWeight: '700'
                    }}>{detailData.priority}</span>
                  </div>

                  {detailData.pnr_number && (
                    <div>
                      <span style={styles.detailLabel}>PNR Number</span>
                      <span style={styles.detailVal}>{detailData.pnr_number}</span>
                    </div>
                  )}

                  {detailData.train_number && (
                    <div>
                      <span style={styles.detailLabel}>Train</span>
                      <span style={styles.detailVal}>{detailData.train_number} {detailData.train_name ? `- ${detailData.train_name}` : ''}</span>
                    </div>
                  )}

                  {detailData.coach && (
                    <div>
                      <span style={styles.detailLabel}>Coach / Seat</span>
                      <span style={styles.detailVal}>{detailData.coach} {detailData.berth ? `/ ${detailData.berth}` : ''}</span>
                    </div>
                  )}

                  {detailData.station_code && detailData.station_code !== 'UNKNOWN' && (
                    <div>
                      <span style={styles.detailLabel}>Station</span>
                      <span style={styles.detailVal}>{detailData.station_code} {detailData.station_name ? `- ${detailData.station_name}` : ''}</span>
                    </div>
                  )}

                  {detailData.travel_date && (
                    <div>
                      <span style={styles.detailLabel}>Date of Issue</span>
                      <span style={styles.detailVal}>{new Date(detailData.travel_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={styles.descSection}>
                  <span style={styles.detailLabel}>Description</span>
                  <p style={styles.descText}>{detailData.description}</p>
                </div>

                {/* Photo Evidence */}
                {detailData.photo_url && (
                  <div style={styles.photoSection}>
                    <span style={styles.detailLabel}>Evidence Photo</span>
                    <img src={detailData.photo_url} alt="Evidence" style={styles.evidenceImage} />
                  </div>
                )}

                {/* Timeline */}
                {detailData.timeline && detailData.timeline.length > 0 && (
                  <div style={styles.timelineSection}>
                    <span style={styles.detailLabel}>Chronological Timeline</span>
                    <div style={styles.timelineList}>
                      {detailData.timeline.map((event, idx) => (
                        <div key={event.id} style={styles.timelineItem}>
                          <div style={styles.timelineDot} />
                          <div style={styles.timelineContent}>
                            <div style={styles.timelineHeader}>
                              <span style={styles.timelineStatus}>{event.to_status}</span>
                              <span style={styles.timelineDate}>
                                {new Date(event.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            {event.note && <p style={styles.timelineNote}>{event.note}</p>}
                            <span style={styles.timelineAuthor}>Updated by: {event.changed_by}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reopen Action Panel */}
                {detailData.status === 'RESOLVED' && (
                  <div style={styles.reopenActionContainer}>
                    {!showReopenForm ? (
                      <div style={styles.reopenPromptRow}>
                        <p style={styles.reopenPromptText}>Not satisfied with the resolution?</p>
                        <button
                          style={styles.reopenTriggerBtn}
                          onClick={() => setShowReopenForm(true)}
                        >
                          Reopen Grievance
                        </button>
                      </div>
                    ) : (
                      <div style={styles.reopenForm}>
                        <label style={styles.label}>Reason for Reopening * (min 20 chars)</label>
                        <textarea
                          style={{
                            ...styles.textarea,
                            borderColor: reopenError ? '#CC0000' : '#E0E0E0',
                            minHeight: '60px',
                            fontSize: '13px'
                          }}
                          placeholder="Please describe in detail why the resolution is unsatisfactory..."
                          value={reopenReason}
                          onChange={(e) => {
                            setReopenReason(e.target.value);
                            if (reopenError) setReopenError('');
                          }}
                        />
                        <div style={styles.reopenControls}>
                          {reopenError && <span style={styles.errorText}>{reopenError}</span>}
                          <div style={{ flex: 1 }} />
                          <button
                            type="button"
                            style={styles.cancelBtn}
                            onClick={() => setShowReopenForm(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            style={styles.submitReopenBtn}
                            disabled={reopenSubmitting}
                            onClick={handleReopen}
                          >
                            {reopenSubmitting ? 'Submitting...' : 'Confirm Reopen'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #E0E0E0',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111111',
    margin: '0 0 16px 0',
  },
  loginPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 0',
    textAlign: 'center',
  },
  lockIcon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  promptText: {
    fontSize: '13px',
    color: '#555555',
    margin: 0,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #E8621A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorText: {
    fontSize: '13px',
    color: '#CC0000',
    margin: 0,
  },
  emptyText: {
    fontSize: '13px',
    color: '#555555',
    margin: 0,
    fontStyle: 'italic',
  },
  list: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    paddingBottom: '12px',
    borderBottom: '1px solid #F5F5F5',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  refNumber: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#E8621A',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  itemDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#555555',
  },
  date: {
    color: '#999999',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #E0E0E0',
    backgroundColor: '#F9FAFB',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#1A3557',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    color: '#888888',
    cursor: 'pointer',
    outline: 'none',
  },
  modalLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#555555',
  },
  modalError: {
    padding: '20px',
    color: '#CC0000',
    textAlign: 'center',
  },
  modalBody: {
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    textAlign: 'left',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: '11px',
    color: '#888888',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  detailValPrimary: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#E8621A',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    backgroundColor: '#F9FAFB',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
  },
  detailVal: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#111111',
    marginTop: '2px',
    textAlign: 'left',
  },
  descSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-start',
  },
  descText: {
    margin: 0,
    fontSize: '13.5px',
    color: '#333333',
    lineHeight: '20px',
    whiteSpace: 'pre-wrap',
    textAlign: 'left',
  },
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-start',
  },
  evidenceImage: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid #E0E0E0',
  },
  timelineSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderTop: '1px dashed #E0E0E0',
    paddingTop: '16px',
    alignItems: 'flex-start',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
    paddingLeft: '16px',
    width: '100%',
  },
  timelineItem: {
    display: 'flex',
    gap: '12px',
    position: 'relative',
    width: '100%',
  },
  timelineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#E8621A',
    position: 'absolute',
    left: '-12px',
    top: '6px',
  },
  timelineContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'flex-start',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  timelineStatus: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#1A3557',
  },
  timelineDate: {
    fontSize: '11px',
    color: '#888888',
  },
  timelineNote: {
    margin: 0,
    fontSize: '12px',
    color: '#555555',
    lineHeight: '16px',
    backgroundColor: '#F5F5F5',
    padding: '8px',
    borderRadius: '6px',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  timelineAuthor: {
    fontSize: '10px',
    color: '#999999',
    fontStyle: 'italic',
  },
  reopenActionContainer: {
    backgroundColor: '#FFF3EC',
    border: '1.5px solid #E8621A',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '10px',
    width: '100%',
    boxSizing: 'border-box',
  },
  reopenPromptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    width: '100%',
  },
  reopenPromptText: {
    margin: 0,
    fontSize: '13.5px',
    fontWeight: '600',
    color: '#E8621A',
  },
  reopenTriggerBtn: {
    backgroundColor: '#E8621A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 2px 6px rgba(232, 26, 26, 0.2)',
  },
  reopenForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#E8621A',
    textAlign: 'left',
  },
  textarea: {
    width: '100%',
    minHeight: '60px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#111111',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'border-color 150ms ease',
    boxSizing: 'border-box',
  },
  reopenControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888888',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
  },
  submitReopenBtn: {
    backgroundColor: '#CC0000',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
  },
  errorText: {
    fontSize: '12px',
    color: '#CC0000',
    fontWeight: '500',
  },
};
