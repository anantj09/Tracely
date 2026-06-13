import { useState, useEffect } from 'react';
import { FileText, Calendar, CheckCircle, Tag, RefreshCw } from 'lucide-react';
import IndiaComplaintMap from '../components/complaints/IndiaComplaintMap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function LiveHeatmapPage() {
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const fetchPublicData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, heatmapRes] = await Promise.all([
        fetch(`${API_BASE_URL}/complaints/public/stats`),
        fetch(`${API_BASE_URL}/complaints/public/heatmap`)
      ]);

      if (!statsRes.ok || !heatmapRes.ok) {
        throw new Error('Failed to retrieve live public heatmap metrics');
      }

      const statsJson = await statsRes.json();
      const heatmapJson = await heatmapRes.json();

      setStats(statsJson.data);
      setHeatmapData(heatmapJson.data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching live heatmap public data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, []);

  const formatCategory = (category) => {
    if (!category) return 'N/A';
    const mapping = {
      'CLEANLINESS': 'Cleanliness',
      'AC_HEATING': 'AC Failure',
      'STAFF': 'Staff Behaviour',
      'FOOD': 'Food Quality',
      'SAFETY': 'Safety',
      'AMENITY': 'Technical Issue',
      'OVERCROWDING': 'Overcrowding',
      'OTHER': 'Other'
    };
    if (mapping[category]) return mapping[category];
    
    return category
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div style={styles.container}>
      {/* Header Row */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Live Public Complaint Heatmap</h1>
          <p style={styles.subheading}>
            Anonymous visual heatmap tracking grievance densities across Indian Railway stations
          </p>
        </div>
        <button style={styles.refreshBtn} onClick={fetchPublicData} disabled={loading}>
          <RefreshCw size={14} style={{ marginRight: '8px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div style={styles.statsGrid}>
        {/* Today's Complaints */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconContainer, backgroundColor: '#FFF3EC', color: '#E8621A' }}>
              <FileText size={20} />
            </div>
            <span style={styles.statLabel}>Today's Complaints</span>
          </div>
          <span style={styles.statValue}>
            {loading ? '...' : stats?.total_complaints_today ?? 0}
          </span>
          <span style={styles.statDesc}>Registered since midnight</span>
        </div>

        {/* This Month's Complaints */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconContainer, backgroundColor: '#E3F2FD', color: '#1565C0' }}>
              <Calendar size={20} />
            </div>
            <span style={styles.statLabel}>This Month</span>
          </div>
          <span style={styles.statValue}>
            {loading ? '...' : stats?.total_complaints_this_month ?? 0}
          </span>
          <span style={styles.statDesc}>Monthly accumulated count</span>
        </div>

        {/* Resolution Rate */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconContainer, backgroundColor: '#E8F5E9', color: '#27AE60' }}>
              <CheckCircle size={20} />
            </div>
            <span style={styles.statLabel}>Resolution Rate</span>
          </div>
          <span style={{ ...styles.statValue, color: '#27AE60' }}>
            {loading ? '...' : `${stats?.resolution_rate_percent ?? 0}%`}
          </span>
          <span style={styles.statDesc}>Of monthly complaints resolved</span>
        </div>

        {/* Most Common Type */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconContainer, backgroundColor: '#FFF9C4', color: '#F5A623' }}>
              <Tag size={20} />
            </div>
            <span style={styles.statLabel}>Most Common Type</span>
          </div>
          <span style={{ ...styles.statValue, fontSize: '20px', color: '#F5A623', height: '38px', display: 'flex', alignItems: 'center' }}>
            {loading ? '...' : formatCategory(stats?.most_common_type)}
          </span>
          <span style={styles.statDesc}>Top reported grievance category</span>
        </div>
      </div>

      {error && (
        <div style={styles.errorCard}>
          <p style={styles.errorText}>⚠️ Failed to load dashboard: {error}</p>
          <button style={styles.retryBtn} onClick={fetchPublicData}>
            Retry Fetch
          </button>
        </div>
      )}

      {/* Map Section */}
      <div style={styles.mapContainer}>
        {loading && heatmapData.length === 0 ? (
          <div style={styles.mapLoadingPlaceholder}>
            <div style={styles.spinner}></div>
            <p style={{ marginTop: '12px', color: '#555555', fontSize: '14px' }}>Loading Live India Heatmap...</p>
          </div>
        ) : (
          <IndiaComplaintMap heatmapData={heatmapData} />
        )}
      </div>

      {/* Footer Info */}
      <footer style={styles.footer}>
        <span>Last updated: {lastUpdated}</span>
        <span style={{ marginLeft: '12px' }}>•</span>
        <span style={{ marginLeft: '12px', color: '#27AE60', fontWeight: '600' }}>● Live Sync Enabled</span>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111111',
    marginBottom: '4px',
  },
  subheading: {
    fontSize: '14px',
    color: '#555555',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#E8621A',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    outline: 'none',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  iconContainer: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111111',
    marginBottom: '4px',
    lineHeight: 1,
  },
  statDesc: {
    fontSize: '12px',
    color: '#555555',
    marginTop: 'auto',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    border: '1px solid #FFCDD2',
    borderRadius: '8px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: '14px',
    color: '#CC0000',
    margin: 0,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#CC0000',
    color: '#FFFFFF',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  mapContainer: {
    width: '100%',
  },
  mapLoadingPlaceholder: {
    height: '600px',
    backgroundColor: '#FAFAFA',
    borderRadius: '12px',
    border: '1px solid #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #E8621A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  footer: {
    fontSize: '12px',
    color: '#888888',
    display: 'flex',
    alignItems: 'center',
  },
};
