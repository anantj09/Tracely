import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Layers, CheckCircle, Clock } from 'lucide-react';
import supabase from '../services/supabase-client';
import SafetyTable from '../components/SafetyTable';
import SafetyMap from '../components/SafetyMap';

export default function SafetyPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'map'
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState(false);

  // Check if we are running in mock environment
  const isMock = !import.meta.env.VITE_SUPABASE_URL
    || import.meta.env.VITE_SUPABASE_URL.includes('mockproject');

  const normalizeIncidents = (list) =>
    (list || []).map((row) => ({
      ...row,
      event_type: row.event_type || row.type || 'Unknown',
      status: row.status || (row.resolved === true ? 'RESOLVED' : 'ACTIVE'),
      location_lat: row.location_lat ?? row.lat ?? null,
      location_lng: row.location_lng ?? row.lng ?? null,
    }));

  const generateMockIncidents = () => {
    const types = ['SOS', 'COMPARTMENT_VIOLATION', 'HAZARD_REPORT'];
    const trains = ['12951', '12301', '12627', '12002', '12723'];
    const coaches = ['A1', 'B2', 'S4', 'GEN', 'B1'];
    const stationCodes = ['NDLS', 'CSTM', 'HWH', 'MAS', 'SBC'];
    const mockData = [];
    
    for (let i = 0; i < 15; i++) {
      const type = types[i % types.length];
      const isActive = i < 6; // First 6 are active
      const date = new Date();
      date.setMinutes(date.getMinutes() - (i * 20));
      
      mockData.push({
        id: `mock-safety-${i}`,
        event_type: type,
        alert_subtype: type === 'SOS' ? 'PERSONAL_SAFETY' : type === 'COMPARTMENT_VIOLATION' ? 'MALE_IN_LADIES' : 'BROKEN_PLATFORM',
        priority: type === 'SOS' ? 'CRITICAL' : type === 'COMPARTMENT_VIOLATION' ? 'HIGH' : 'MEDIUM',
        train_number: trains[i % trains.length],
        coach: coaches[i % coaches.length],
        station_code: stationCodes[i % stationCodes.length],
        location_lat: 12.9716 + (i * 0.01),
        location_lng: 77.5946 + (i * 0.01),
        status: isActive ? 'ACTIVE' : 'RESOLVED',
        created_at: date.toISOString(),
        resolved_at: isActive ? null : new Date().toISOString(),
        updated_at: date.toISOString()
      });
    }
    return mockData;
  };

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (isMock) {
        setIncidents((prev) => {
          if (prev.length > 0) return prev;
          return normalizeIncidents(generateMockIncidents());
        });
      } else {
        const { data, error: dbError } = await supabase
          .from('safety_events')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbError) throw dbError;
        const normalized = normalizeIncidents(data || []);
        if (normalized.length > 0) {
          setIncidents(normalized);
        } else {
          // DB is empty — show mock data for demo
          console.info('No safety events in DB, showing mock data for demo');
          setIncidents(normalizeIncidents(generateMockIncidents()));
        }
      }
    } catch (err) {
      console.warn('Safety events query fallback: table might not exist yet. Using mock fallback.', err);
      setIncidents(normalizeIncidents(generateMockIncidents()));
      setError(false);
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncidents();
    }, 0);

    // Subscribe to Postgres changes on safety_events
    const channel = supabase
      .channel('safety-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_events' }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchIncidents]);

  const handleResolve = async (id) => {
    setResolvingId(id);

    // Optimistic Update: instantly update local state so the UI reflects "Resolved"
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? {
              ...inc,
              resolved: true,
              status: 'RESOLVED',
              resolved_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : inc
      )
    );

    try {
      if (!isMock && !id.startsWith('mock-')) {
        const { error } = await supabase
          .from('safety_events')
          .update({
            status: 'RESOLVED',    // new schema (status VARCHAR)
            resolved: true,        // old schema (resolved BOOLEAN)
            resolved_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Mock delay for UI feedback
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (err) {
      console.error('Failed to resolve safety incident:', err);
      // Revert state if failed
      fetchIncidents();
    } finally {
      setResolvingId(null);
    }
  };

  // Metric computations
  const totalCount = incidents.length;
  const activeSosCount = incidents.filter((i) => i.event_type === 'SOS' && i.status === 'ACTIVE').length;

  const getResolvedToday = () => {
    if (isMock) return 3; // Demo Day Mock Value
    const todayStr = new Date().toDateString();
    return incidents.filter((inc) => {
      if (inc.status !== 'RESOLVED') return false;
      const dateToCheck = inc.resolved_at || inc.updated_at || inc.created_at;
      return new Date(dateToCheck).toDateString() === todayStr;
    }).length;
  };

  const getAvgResolutionTime = () => {
    if (isMock) return '18 mins'; // Demo Day Mock Value
    const resolvedWithTimes = incidents.filter((i) => i.status === 'RESOLVED' && i.resolved_at && i.created_at);
    if (resolvedWithTimes.length === 0) return 'N/A';
    const sum = resolvedWithTimes.reduce((acc, curr) => {
      const delta = new Date(curr.resolved_at) - new Date(curr.created_at);
      return acc + delta;
    }, 0);
    const avgMs = sum / resolvedWithTimes.length;
    const avgMins = Math.round(avgMs / 60000);
    return `${avgMins} mins`;
  };

  return (
    <div style={styles.container}>
      {/* Title Bar */}
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <h1 style={styles.heading}>Safety Incidents</h1>
          {activeSosCount > 0 && (
            <span style={styles.sosBadge}>{activeSosCount} SOS ACTIVE</span>
          )}
        </div>

        {/* View Toggle */}
        <div style={styles.toggleGroup}>
          <button
            type="button"
            style={{
              ...styles.toggleBtn,
              ...(viewMode === 'table' ? styles.toggleBtnActive : {})
            }}
            onClick={() => setViewMode('table')}
          >
            Table View
          </button>
          <button
            type="button"
            style={{
              ...styles.toggleBtn,
              ...(viewMode === 'map' ? styles.toggleBtnActive : {})
            }}
            onClick={() => setViewMode('map')}
          >
            Map View
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statCard}>
          <Layers size={20} color="#1A3557" />
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Total Incidents</span>
            <span style={styles.statValue}>{totalCount}</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <AlertCircle size={20} color="#CC0000" />
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Active SOS Alerts</span>
            <span style={{ ...styles.statValue, color: '#CC0000' }}>{activeSosCount}</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <CheckCircle size={20} color="#27AE60" />
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Resolved Today</span>
            <span style={styles.statValue}>{getResolvedToday()}</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={20} color="#E8621A" />
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Avg Resolution</span>
            <span style={styles.statValue}>{getAvgResolutionTime()}</span>
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorText}>Something went wrong. Please refresh the page.</span>
          <button style={styles.retryBtn} onClick={fetchIncidents}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner}></div>
          <span style={styles.loadingText}>Loading incident board...</span>
        </div>
      ) : incidents.length === 0 ? (
        <div style={styles.emptyWrapper}>
          <CheckCircle size={48} color="#CCCCCC" style={{ marginBottom: '12px' }} />
          <p style={styles.emptyText}>No safety incidents logged in the database.</p>
        </div>
      ) : viewMode === 'table' ? (
        <SafetyTable
          incidents={incidents}
          onResolve={handleResolve}
          resolvingId={resolvingId}
        />
      ) : (
        <SafetyMap
          incidents={incidents}
          onResolve={handleResolve}
          resolvingId={resolvingId}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  heading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111111',
    margin: 0
  },
  sosBadge: {
    backgroundColor: '#CC0000',
    color: '#FFFFFF',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '20px',
    animation: 'pulse 1.5s infinite',
    letterSpacing: '0.5px'
  },
  toggleGroup: {
    display: 'flex',
    backgroundColor: '#E0E0E0',
    padding: '4px',
    borderRadius: '8px'
  },
  toggleBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#555555',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 100ms ease, color 100ms ease',
    outline: 'none'
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    color: '#E8621A',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #F0F0F0'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    borderRight: '1px solid #F0F0F0',
    paddingRight: '10px',
    ':last-child': {
      borderRight: 'none'
    }
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111111'
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #F3F3F3',
    borderTop: '4px solid #E8621A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  loadingText: {
    color: '#555555',
    fontSize: '14px'
  },
  emptyWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  emptyText: {
    color: '#555555',
    fontSize: '15px',
    fontWeight: '500'
  },
  errorCard: {
    border: '1px solid var(--color-orange)',
    backgroundColor: '#FFF5F0',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
  },
  errorText: {
    color: 'var(--color-orange)',
    fontWeight: '600',
    fontSize: '15px',
  },
  retryBtn: {
    backgroundColor: 'var(--color-orange)',
    color: 'var(--color-white)',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 150ms ease',
    outline: 'none',
  },
};
