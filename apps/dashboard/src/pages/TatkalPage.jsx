import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import supabase from '../services/supabase-client';
import KPICard from '../components/KPICard';

const STATUS_COLOURS = {
  PENDING: { bg: '#FFF3E0', text: '#E65100', label: 'Pending' },
  PROCESSING: { bg: '#E3F2FD', text: '#1565C0', label: 'Processing' },
  CONFIRMED: { bg: '#E8F5E9', text: '#2E7D32', label: 'Confirmed' },
  REJECTED: { bg: '#FFEBEE', text: '#C62828', label: 'Rejected' },
  WAITLISTED: { bg: '#F3E5F5', text: '#6A1B9A', label: 'Waitlisted' },
};

const URGENCY_COLOURS = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#FF5722', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#CC0000'];

const ROUTES = [
  { origin: 'NDLS', dest: 'MMCT', label: 'NDLS→MMCT' },
  { origin: 'NDLS', dest: 'HWH', label: 'NDLS→HWH' },
  { origin: 'SBC', dest: 'MAS', label: 'SBC→MAS' },
  { origin: 'MAS', dest: 'HYB', label: 'MAS→HYB' },
  { origin: 'AMD', dest: 'MMCT', label: 'AMD→MMCT' },
  { origin: 'NDLS', dest: 'LKO', label: 'NDLS→LKO' },
  { origin: 'HWH', dest: 'BBS', label: 'HWH→BBS' },
];

const CLASSES = ['SL', '3A', '2A', '1A'];
const TRAINS = ['12951', '12301', '12627', '12002', '12723', '12259', '12560'];

export default function TatkalPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const isMock = !import.meta.env.VITE_SUPABASE_URL
    || import.meta.env.VITE_SUPABASE_URL.includes('mockproject');

  // --- Data Fetching ---
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (isMock) {
        setRequests(generateMockRequests());
      } else {
        const { data, error: dbError } = await supabase
          .from('tatkal_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (dbError) throw dbError;

        if (data && data.length > 0) {
          setRequests(data);
        } else {
          console.info('No tatkal_requests in DB, showing mock data for demo');
          setRequests(generateMockRequests());
        }
      }
    } catch (err) {
      console.warn('Tatkal requests query fallback:', err);
      setRequests(generateMockRequests());
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  const generateMockRequests = () => {
    const statuses = ['PENDING', 'PENDING', 'PENDING', 'PROCESSING', 'PROCESSING', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'REJECTED', 'WAITLISTED'];
    const names = [
      'Rajesh K.', 'Priya S.', 'Amit G.', 'Sunita D.', 'Vikram M.',
      'Ananya P.', 'Rahul T.', 'Meera N.', 'Deepak R.', 'Kavita B.',
      'Sanjay V.', 'Pooja L.', 'Arun W.', 'Neha J.', 'Manish C.',
      'Swati H.', 'Ravi K.', 'Divya A.', 'Suresh P.', 'Lakshmi G.',
    ];
    const mock = [];
    for (let i = 0; i < 20; i++) {
      const route = ROUTES[i % ROUTES.length];
      const status = statuses[i % statuses.length];
      const date = new Date();
      date.setMinutes(date.getMinutes() - i * 12);
      const travelDate = new Date();
      travelDate.setDate(travelDate.getDate() + (i % 4) + 1);

      mock.push({
        id: `mock-tatkal-${i}`,
        passenger_name: names[i % names.length],
        from_station: route.origin,
        to_station: route.dest,
        train_number: TRAINS[i % TRAINS.length],
        class: CLASSES[i % CLASSES.length],
        travel_date: travelDate.toISOString().split('T')[0],
        urgency_score: Math.round(3 + Math.random() * 7),
        status,
        pnr: `${2600000000 + i * 137}`,
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
      });
    }
    return mock;
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchRequests(), 0);

    const channel = supabase
      .channel('tatkal-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tatkal_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  // --- Actions ---
  const handleAction = async (id, newStatus) => {
    setProcessingId(id);
    setRequests(prev => prev.map(r =>
      r.id === id ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r
    ));
    try {
      if (!isMock && !id.startsWith('mock-')) {
        const { error } = await supabase
          .from('tatkal_requests')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error('Tatkal action failed:', err);
      fetchRequests();
    } finally {
      setProcessingId(null);
    }
  };

  // --- Computed Metrics ---
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const processingCount = requests.filter(r => r.status === 'PROCESSING').length;
  const confirmedCount = requests.filter(r => r.status === 'CONFIRMED').length;
  const avgUrgency = requests.length > 0
    ? (requests.reduce((sum, r) => sum + (r.urgency_score || 0), 0) / requests.length).toFixed(1)
    : '—';

  // --- Chart Data ---
  const getRouteChartData = () => {
    const routeStats = {};
    ROUTES.forEach(r => {
      routeStats[r.label] = { route: r.label, pending: 0, confirmed: 0, rejected: 0, other: 0 };
    });
    requests.forEach(req => {
      const key = `${req.from_station}→${req.to_station}`;
      if (routeStats[key]) {
        if (req.status === 'PENDING' || req.status === 'PROCESSING') routeStats[key].pending += 1;
        else if (req.status === 'CONFIRMED') routeStats[key].confirmed += 1;
        else if (req.status === 'REJECTED') routeStats[key].rejected += 1;
        else routeStats[key].other += 1;
      }
    });
    return Object.values(routeStats);
  };

  const getQuotaData = () => {
    return CLASSES.map(cls => {
      const total = requests.filter(r => r.class === cls).length;
      const confirmed = requests.filter(r => r.class === cls && r.status === 'CONFIRMED').length;
      const quota = cls === 'SL' ? 30 : cls === '3A' ? 20 : cls === '2A' ? 12 : 8;
      return { class: cls, used: confirmed, quota, total, pct: Math.round((confirmed / quota) * 100) };
    });
  };

  const getUrgencyDistribution = () => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({ score: `${i + 1}`, count: 0 }));
    requests.forEach(r => {
      const idx = Math.min(Math.max(Math.round(r.urgency_score || 1) - 1, 0), 9);
      buckets[idx].count += 1;
    });
    return buckets;
  };

  // --- Filtered Requests ---
  const filteredRequests = statusFilter === 'ALL'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const routeChartData = getRouteChartData();
  const quotaData = getQuotaData();
  const urgencyDist = getUrgencyDistribution();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Tatkal Booking Monitor</h1>
          <p style={styles.subheading}>Real-time Tatkal quota utilisation and request queue management</p>
        </div>
        <button style={styles.refreshBtn} onClick={fetchRequests}>
          <RefreshCw size={14} style={{ marginRight: '8px' }} />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div style={styles.kpiGrid}>
        <KPICard title="Pending Requests" value={pendingCount} icon={Clock} colour="#E65100" description="Awaiting processing" isLoading={loading} />
        <KPICard title="Being Processed" value={processingCount} icon={Zap} colour="#1565C0" description="Currently in queue" isLoading={loading} />
        <KPICard title="Confirmed Today" value={confirmedCount} icon={CheckCircle} colour="#2E7D32" description="Successfully booked" isLoading={loading} />
        <KPICard title="Avg Urgency Score" value={avgUrgency} icon={TrendingUp} colour="var(--color-orange)" description="Scale of 1–10" isLoading={loading} />
      </div>

      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorText}>Failed to load Tatkal data.</span>
          <button style={styles.retryBtn} onClick={fetchRequests}>Retry</button>
        </div>
      ) : loading ? (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading Tatkal queue...</span>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div style={styles.chartsRow}>
            {/* Route Distribution Chart */}
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>Requests by Route</h2>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="route" tick={{ fontSize: 11, fill: '#555555' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#555555' }} allowDecimals={false} />
                    <Tooltip content={<RouteTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="pending" name="Pending" stackId="a" fill="#FF9800" />
                    <Bar dataKey="confirmed" name="Confirmed" stackId="a" fill="#4CAF50" />
                    <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#E53935" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Urgency Distribution */}
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>Urgency Score Distribution</h2>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={urgencyDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="score" tick={{ fontSize: 11, fill: '#555555' }} label={{ value: 'Urgency Score', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#555555' }} allowDecimals={false} />
                    <Tooltip content={<UrgencyTooltip />} />
                    <Bar dataKey="count" name="Requests">
                      {urgencyDist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={URGENCY_COLOURS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quota Utilization */}
          <div style={styles.quotaCard}>
            <h2 style={styles.chartTitle}>Tatkal Quota Utilisation by Class</h2>
            <div style={styles.quotaGrid}>
              {quotaData.map(q => (
                <div key={q.class} style={styles.quotaItem}>
                  <div style={styles.quotaHeader}>
                    <span style={styles.quotaClass}>{q.class}</span>
                    <span style={styles.quotaNumbers}>{q.used} / {q.quota} seats</span>
                  </div>
                  <div style={styles.progressTrack}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${Math.min(q.pct, 100)}%`,
                      backgroundColor: q.pct >= 90 ? '#E53935' : q.pct >= 70 ? '#FF9800' : '#4CAF50',
                    }} />
                  </div>
                  <span style={styles.quotaPct}>{q.pct}% utilised • {q.total} total requests</span>
                </div>
              ))}
            </div>
          </div>

          {/* Request Queue Table */}
          <div style={styles.tableSection}>
            <div style={styles.tableHeader}>
              <h2 style={styles.chartTitle}>Tatkal Request Queue</h2>
              <div style={styles.filterGroup}>
                {['ALL', 'PENDING', 'PROCESSING', 'CONFIRMED', 'REJECTED', 'WAITLISTED'].map(s => (
                  <button
                    key={s}
                    style={{
                      ...styles.filterBtn,
                      ...(statusFilter === s ? styles.filterBtnActive : {}),
                    }}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === 'ALL' ? 'All' : (STATUS_COLOURS[s]?.label || s)}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Passenger</th>
                    <th style={styles.th}>Route</th>
                    <th style={styles.th}>Train</th>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Travel Date</th>
                    <th style={styles.th}>Urgency</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ ...styles.td, textAlign: 'center', padding: '40px', color: '#888' }}>
                        No requests matching filter.
                      </td>
                    </tr>
                  ) : filteredRequests.map(req => {
                    const statusStyle = STATUS_COLOURS[req.status] || STATUS_COLOURS.PENDING;
                    const isProcessing = processingId === req.id;
                    const urgencyColor = req.urgency_score >= 8 ? '#CC0000' : req.urgency_score >= 5 ? '#E65100' : '#2E7D32';
                    return (
                      <tr key={req.id} style={{
                        ...styles.row,
                        backgroundColor: req.urgency_score >= 8 ? '#FFF8F6' : '#FFFFFF',
                      }}>
                        <td style={styles.td}>{timeAgo(req.created_at)}</td>
                        <td style={styles.td}><strong>{req.passenger_name || '—'}</strong></td>
                        <td style={styles.td}>{req.from_station}→{req.to_station}</td>
                        <td style={styles.td}><strong>{req.train_number}</strong></td>
                        <td style={styles.td}>
                          <span style={styles.classBadge}>{req.class}</span>
                        </td>
                        <td style={styles.td}>{req.travel_date}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.urgencyBadge, backgroundColor: urgencyColor + '18', color: urgencyColor }}>
                            {req.urgency_score}/10
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                            {statusStyle.label}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {req.status === 'PENDING' || req.status === 'PROCESSING' ? (
                            <div style={styles.actionGroup}>
                              <button
                                style={{ ...styles.approveBtn, opacity: isProcessing ? 0.6 : 1 }}
                                disabled={isProcessing}
                                onClick={() => handleAction(req.id, 'CONFIRMED')}
                                title="Confirm booking"
                              >
                                {isProcessing ? '...' : '✓ Confirm'}
                              </button>
                              <button
                                style={{ ...styles.rejectBtn, opacity: isProcessing ? 0.6 : 1 }}
                                disabled={isProcessing}
                                onClick={() => handleAction(req.id, 'REJECTED')}
                                title="Reject request"
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#888' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Helper ---
function timeAgo(isoString) {
  const diff = Math.floor((new Date() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(isoString).toLocaleDateString();
}

// --- Custom Tooltips ---
const RouteTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={tooltipStyles.wrapper}>
        <p style={tooltipStyles.title}>{data.route}</p>
        <p style={tooltipStyles.line}>Pending: <strong style={{ color: '#FF9800' }}>{data.pending}</strong></p>
        <p style={tooltipStyles.line}>Confirmed: <strong style={{ color: '#4CAF50' }}>{data.confirmed}</strong></p>
        <p style={tooltipStyles.line}>Rejected: <strong style={{ color: '#E53935' }}>{data.rejected}</strong></p>
      </div>
    );
  }
  return null;
};

const UrgencyTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={tooltipStyles.wrapper}>
        <p style={tooltipStyles.title}>Urgency Score: {data.score}</p>
        <p style={tooltipStyles.line}>Requests: <strong>{data.count}</strong></p>
      </div>
    );
  }
  return null;
};

const tooltipStyles = {
  wrapper: {
    backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px',
    padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontFamily: 'inherit',
  },
  title: { fontSize: '12px', fontWeight: '700', color: '#1A3557', margin: '0 0 4px 0' },
  line: { fontSize: '11px', color: '#555555', margin: '0 0 2px 0' },
};

// --- Styles ---
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  heading: { fontSize: '28px', fontWeight: '700', color: '#111111', marginBottom: '4px' },
  subheading: { fontSize: '14px', color: '#555555' },
  refreshBtn: {
    display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-orange)', border: 'none',
    borderRadius: '6px', padding: '8px 16px', color: '#FFFFFF', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', transition: 'background-color 150ms ease', outline: 'none', fontFamily: 'inherit',
  },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },

  // Charts
  chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #F0F0F0',
  },
  chartTitle: { fontSize: '16px', fontWeight: '700', color: '#1A3557', marginBottom: '16px', margin: 0 },

  // Quota
  quotaCard: {
    backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #F0F0F0',
  },
  quotaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '16px' },
  quotaItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  quotaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  quotaClass: { fontSize: '14px', fontWeight: '700', color: '#1A3557' },
  quotaNumbers: { fontSize: '12px', color: '#555555', fontWeight: '500' },
  progressTrack: {
    width: '100%', height: '10px', backgroundColor: '#F0F0F0', borderRadius: '5px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: '5px', transition: 'width 600ms ease, background-color 300ms ease',
  },
  quotaPct: { fontSize: '11px', color: '#888888' },

  // Table
  tableSection: { display: 'flex', flexDirection: 'column', gap: '12px' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  filterGroup: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterBtn: {
    border: '1px solid #E0E0E0', backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '6px 12px',
    fontSize: '12px', fontWeight: '500', color: '#555555', cursor: 'pointer', transition: 'all 150ms ease',
    fontFamily: 'inherit', outline: 'none',
  },
  filterBtnActive: {
    backgroundColor: '#1A3557', color: '#FFFFFF', borderColor: '#1A3557', fontWeight: '600',
  },
  tableCard: {
    backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  headerRow: { borderBottom: '2px solid #E0E0E0', backgroundColor: '#F9F9F9' },
  th: { padding: '12px 16px', fontWeight: '600', color: '#555555', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' },
  row: { borderBottom: '1px solid #F0F0F0', transition: 'background-color 100ms' },
  td: { padding: '10px 16px', verticalAlign: 'middle' },
  badge: { display: 'inline-block', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '12px' },
  classBadge: {
    display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px',
    backgroundColor: '#E8EDF2', color: '#1A3557',
  },
  urgencyBadge: {
    display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px',
  },
  actionGroup: { display: 'flex', gap: '6px', alignItems: 'center' },
  approveBtn: {
    backgroundColor: '#2E7D32', color: '#FFFFFF', border: 'none', borderRadius: '6px',
    padding: '5px 12px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
  },
  rejectBtn: {
    backgroundColor: 'transparent', color: '#C62828', border: '1.5px solid #C62828', borderRadius: '6px',
    padding: '4px 8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },

  // Loading / Error
  loadingWrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '400px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  spinner: {
    width: '40px', height: '40px', border: '4px solid #F3F3F3', borderTop: '4px solid #E8621A',
    borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px',
  },
  loadingText: { color: '#555555', fontSize: '14px' },
  errorCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    backgroundColor: '#FFF5F0', border: '1px solid #E8621A', borderRadius: '8px', padding: '24px',
  },
  errorText: { color: '#E8621A', fontWeight: '600', fontSize: '15px' },
  retryBtn: {
    backgroundColor: 'var(--color-orange)', color: '#FFFFFF', border: 'none',
    borderRadius: '6px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit',
  },
};
