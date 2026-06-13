import { useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Sparkles } from 'lucide-react';
import supabase from '../services/supabase-client';

const ROUTES = [
  { value: 'All Routes', label: 'All Routes' },
  { value: 'NDLS-MMCT', label: 'NDLS→MMCT' },
  { value: 'NDLS-HWH', label: 'NDLS→HWH' },
  { value: 'SBC-MAS', label: 'SBC→MAS' },
  { value: 'MAS-HYB', label: 'MAS→HYB' },
  { value: 'AMD-MMCT', label: 'AMD→MMCT' },
  { value: 'NDLS-LKO', label: 'NDLS→LKO' },
  { value: 'HWH-BBS', label: 'HWH→BBS' },
  { value: 'SBC-HYB', label: 'SBC→HYB' }
];

const CLASSES = ['All', 'SL', '3A', '2A', '1A', 'GEN'];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DemandPage() {
  const [routeFilter, setRouteFilter] = useState('All Routes');
  const [classFilter, setClassFilter] = useState('All');
  const [surgeOnly, setSurgeOnly] = useState(false);

  // Filters actually used for calculations (updated when clicking Analyze)
  const [activeFilters, setActiveFilters] = useState({
    route: 'All Routes',
    classVal: 'All',
    surge: false
  });

  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isMock = !import.meta.env.VITE_SUPABASE_URL
    || import.meta.env.VITE_SUPABASE_URL.includes('mockproject');

  const generateMockIntents = () => {
    const originsDestinations = [
      { origin: 'NDLS', dest: 'MMCT' },
      { origin: 'NDLS', dest: 'HWH' },
      { origin: 'SBC', dest: 'MAS' },
      { origin: 'MAS', dest: 'HYB' },
      { origin: 'AMD', dest: 'MMCT' },
      { origin: 'NDLS', dest: 'LKO' },
      { origin: 'HWH', dest: 'BBS' },
      { origin: 'SBC', dest: 'HYB' }
    ];
    const mockData = [];
    const classes = ['SL', '3A', '2A', '1A', 'GEN'];
    
    // Generate 120 travel intent records distributed across the routes
    for (let i = 0; i < 120; i++) {
      const route = originsDestinations[i % originsDestinations.length];
      const classVal = classes[i % classes.length];
      const isSurge = (i % 3 === 0); // 33% surge
      
      // Intent dates within next 7 days
      const date = new Date();
      date.setDate(date.getDate() + (i % 7));
      
      mockData.push({
        id: `mock-intent-${i}`,
        from_station: route.origin,
        to_station: route.dest,
        class: classVal,
        is_surge: isSurge,
        travel_date: date.toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });
    }
    return mockData;
  };

  const fetchIntents = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (isMock) {
        setIntents(generateMockIntents());
      } else {
        const { data, error: dbError } = await supabase.from('travel_intents').select('*');
        if (dbError) throw dbError;
        const normalized = (data || []).map(item => ({
          ...item,
          is_surge: item.is_surge_route !== undefined ? item.is_surge_route : item.is_surge
        }));
        setIntents(normalized);
      }
    } catch (err) {
      console.warn('Travel intents query fallback: table might not exist yet.', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIntents();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchIntents]);

  const handleAnalyze = (e) => {
    e.preventDefault();
    setActiveFilters({
      route: routeFilter,
      classVal: classFilter,
      surge: surgeOnly
    });
  };

  // Process data for Chart 1 (Travel Intent by Route)
  const getRouteChartData = () => {
    const routeStats = {};
    // Initialize all routes for consistency
    ROUTES.slice(1).forEach((r) => {
      routeStats[r.value] = { route: r.label, surge: 0, normal: 0, total: 0 };
    });

    intents.forEach((item) => {
      const routeKey = `${item.from_station || item.origin}-${item.to_station || item.destination}`;
      // Apply filters in memory
      if (activeFilters.route !== 'All Routes' && routeKey !== activeFilters.route) return;
      if (activeFilters.classVal !== 'All' && item.class !== activeFilters.classVal) return;
      if (activeFilters.surge && !item.is_surge) return;

      if (routeStats[routeKey]) {
        if (item.is_surge) {
          routeStats[routeKey].surge += 1;
        } else {
          routeStats[routeKey].normal += 1;
        }
        routeStats[routeKey].total += 1;
      }
    });

    return Object.values(routeStats);
  };

  // Process data for Chart 2 (Intent by Day of Week)
  const getDayChartData = () => {
    const dayStats = DAYS_OF_WEEK.map((day) => ({ day, surge: 0, normal: 0, total: 0 }));

    intents.forEach((item) => {
      const routeKey = `${item.from_station || item.origin}-${item.to_station || item.destination}`;
      // Apply filters in memory
      if (activeFilters.route !== 'All Routes' && routeKey !== activeFilters.route) return;
      if (activeFilters.classVal !== 'All' && item.class !== activeFilters.classVal) return;
      if (activeFilters.surge && !item.is_surge) return;

      // Extract day index from travel_date (0 = Sun, 1 = Mon...)
      const date = new Date(item.travel_date);
      const dayVal = date.getDay();
      const index = dayVal === 0 ? 6 : dayVal - 1; // Map Sun to last index

      if (dayStats[index]) {
        if (item.is_surge) {
          dayStats[index].surge += 1;
        } else {
          dayStats[index].normal += 1;
        }
        dayStats[index].total += 1;
      }
    });

    return dayStats;
  };

  const routeChartData = getRouteChartData();
  const dayChartData = getDayChartData();



  return (
    <div style={styles.container}>
      <div>
        <h1 style={styles.heading}>Demand Forecast</h1>
        <p style={styles.subheading}>Travel intent signals by route for the next 7 days</p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleAnalyze} style={styles.filterForm}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Route</label>
          <select
            style={styles.select}
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
          >
            {ROUTES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Class</label>
          <select
            style={styles.select}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            {CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={styles.checkboxGroup}>
          <input
            id="surge-only-checkbox"
            type="checkbox"
            checked={surgeOnly}
            onChange={(e) => setSurgeOnly(e.target.checked)}
            style={styles.checkbox}
          />
          <label htmlFor="surge-only-checkbox" style={styles.checkboxLabel}>Show surge only</label>
        </div>

        <button type="submit" style={styles.analyzeBtn}>
          Analyze
        </button>
      </form>

      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorText}>Something went wrong. Please refresh the page.</span>
          <button style={styles.retryBtn} onClick={fetchIntents}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner}></div>
          <span style={styles.loadingText}>Fetching travel intent logs...</span>
        </div>
      ) : (
        <div style={styles.layoutGrid}>
          {/* Charts Area */}
          <div style={styles.chartsPanel}>
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>Travel Intent by Route</h2>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="route" tick={{ fontSize: 11, fill: '#555555' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#555555' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="surge" name="Surge Intent" stackId="a" fill="#E8621A" />
                    <Bar dataKey="normal" name="Normal Intent" stackId="a" fill="#CCCCCC" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>Intent by Day of Week</h2>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#555555' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#555555' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="surge" name="Surge Intent" stackId="a" fill="#E8621A" />
                    <Bar dataKey="normal" name="Normal Intent" stackId="a" fill="#27AE60" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Recommendation Sidebar */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <Sparkles size={18} color="#E8621A" />
              <h2 style={styles.sidebarHeading}>AI Recommendation</h2>
            </div>
            <p style={styles.recommendationText}>
              Route <strong>NDLS→MMCT</strong> is showing <strong>43%</strong> surge intent for this Saturday.
              Consider deploying additional Rajdhani coaches on <strong>12951</strong>.
            </p>
            <div style={styles.checklistTitle}>Action Items:</div>
            <ul style={styles.checklist}>
              <li style={styles.checklistItem}>
                <span style={styles.checkIcon}>✓</span>
                <span style={styles.checkText}>Monitor Tatkal quota for 12951 on Jun 14</span>
              </li>
              <li style={styles.checklistItem}>
                <span style={styles.checkIcon}>✓</span>
                <span style={styles.checkText}>Coordinate with Zone NR for coach augmentation</span>
              </li>
              <li style={styles.checklistItem}>
                <span style={styles.checkIcon}>✓</span>
                <span style={styles.checkText}>Alert Station Master at NDLS for crowd management</span>
              </li>
            </ul>
          </div>
        </div>
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
  heading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111111',
    marginBottom: '4px'
  },
  subheading: {
    fontSize: '14px',
    color: '#555555'
  },
  filterForm: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    backgroundColor: '#FFFFFF',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    flexWrap: 'wrap',
    marginBottom: '8px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1',
    minWidth: '160px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#555555'
  },
  select: {
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#111111',
    background: '#FFFFFF',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '42px',
    paddingBottom: '2px'
  },
  checkbox: {
    accentColor: '#E8621A',
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#111111',
    fontWeight: '500',
    cursor: 'pointer',
    userSelect: 'none'
  },
  analyzeBtn: {
    backgroundColor: '#1A3557',
    color: '#FFFFFF',
    borderRadius: '8px',
    padding: '11px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    fontFamily: 'inherit',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      backgroundColor: '#112238'
    }
  },
  layoutGrid: {
    display: 'flex',
    gap: '24px',
    alignItems: 'stretch',
    flexWrap: 'wrap'
  },
  chartsPanel: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    minWidth: '400px'
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #F0F0F0'
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1A3557',
    marginBottom: '16px'
  },
  sidebar: {
    width: '320px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px 20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #F0F0F0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: 'fit-content'
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid #E0E0E0',
    paddingBottom: '12px'
  },
  sidebarHeading: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1A3557',
    margin: 0
  },
  recommendationText: {
    fontSize: '13px',
    color: '#555555',
    lineHeight: '1.6',
    margin: 0
  },
  checklistTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#AAAAAA',
    textTransform: 'uppercase',
    marginTop: '8px'
  },
  checklist: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  checklistItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start'
  },
  checkIcon: {
    color: '#E8621A',
    fontWeight: '700',
    fontSize: '14px',
    lineHeight: '1'
  },
  checkText: {
    fontSize: '12px',
    color: '#555555',
    lineHeight: '1.4'
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
  tooltip: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    fontFamily: 'inherit'
  },
  tooltipTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#1A3557',
    margin: '0 0 4px 0'
  },
  tooltipText: {
    fontSize: '11px',
    color: '#555555',
    margin: '0 0 2px 0'
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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.total || (data.surge + data.normal);
    const surgePercent = total > 0 ? Math.round((data.surge / total) * 100) : 0;
    return (
      <div style={styles.tooltip}>
        <p style={styles.tooltipTitle}>{data.route || data.day}</p>
        <p style={styles.tooltipText}>Total Signals: <strong>{total}</strong></p>
        <p style={styles.tooltipText}>Surge Ratio: <strong style={{ color: '#E8621A' }}>{surgePercent}%</strong></p>
      </div>
    );
  }
  return null;
};
