import { useState, useEffect, useCallback } from 'react';
import { FileEdit, ShieldAlert, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import supabase from '../services/supabase-client';
import KPICard from '../components/KPICard';

export default function OverviewPage() {
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [safetyCount, setSafetyCount] = useState(0);
  const [surgeCount, setSurgeCount] = useState(0);
  const [tatkalCount, setTatkalCount] = useState(0);
  const [error, setError] = useState(false);

  const [loading, setLoading] = useState({
    complaints: true,
    safety: true,
    surge: true,
    tatkal: true,
  });

  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const isMock = !import.meta.env.VITE_SUPABASE_URL
    || import.meta.env.VITE_SUPABASE_URL.includes('mockproject');

  // Count fetchers
  const fetchComplaintsCount = useCallback(async () => {
    if (isMock) {
      setComplaintsCount(12);
      setLoading((prev) => ({ ...prev, complaints: false }));
      return;
    }
    setLoading((prev) => ({ ...prev, complaints: true }));
    try {
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      const { count, error: dbError } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayMidnight.toISOString());

      if (dbError) throw dbError;
      setComplaintsCount(count || 0);
    } catch (err) {
      console.warn('Complaints query failed:', err);
      throw err;
    } finally {
      setLoading((prev) => ({ ...prev, complaints: false }));
    }
  }, [isMock]);

  const fetchSafetyCount = useCallback(async () => {
    if (isMock) {
      setSafetyCount(5);
      setLoading((prev) => ({ ...prev, safety: false }));
      return;
    }
    setLoading((prev) => ({ ...prev, safety: true }));
    try {
      const { count, error: dbError } = await supabase
        .from('safety_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'SOS')
        .eq('status', 'ACTIVE');

      if (dbError) throw dbError;
      setSafetyCount(count || 0);
    } catch (err) {
      console.warn('Safety events query failed:', err);
      throw err;
    } finally {
      setLoading((prev) => ({ ...prev, safety: false }));
    }
  }, [isMock]);

  const fetchSurgeCount = useCallback(async () => {
    if (isMock) {
      setSurgeCount(8);
      setLoading((prev) => ({ ...prev, surge: false }));
      return;
    }
    setLoading((prev) => ({ ...prev, surge: true }));
    try {
      const { count, error: dbError } = await supabase
        .from('travel_intents')
        .select('*', { count: 'exact', head: true })
        .eq('is_surge_route', true);

      if (dbError) throw dbError;
      setSurgeCount(count || 0);
    } catch (err) {
      console.warn('Travel intents query failed:', err);
      throw err;
    } finally {
      setLoading((prev) => ({ ...prev, surge: false }));
    }
  }, [isMock]);

  const fetchTatkalCount = useCallback(async () => {
    if (isMock) {
      setTatkalCount(3);
      setLoading((prev) => ({ ...prev, tatkal: false }));
      return;
    }
    setLoading((prev) => ({ ...prev, tatkal: true }));
    try {
      const { count, error: dbError } = await supabase
        .from('tatkal_requests')
        .select('*', { count: 'exact', head: true })
        .gt('urgency_score', 7);

      if (dbError) throw dbError;
      setTatkalCount(count || 0);
    } catch (err) {
      console.warn('Tatkal requests query failed:', err);
      throw err;
    } finally {
      setLoading((prev) => ({ ...prev, tatkal: false }));
    }
  }, [isMock]);

  const fetchAllMetrics = useCallback(async () => {
    setError(false);
    setLoading({
      complaints: true,
      safety: true,
      surge: true,
      tatkal: true,
    });
    try {
      await Promise.all([
        fetchComplaintsCount(),
        fetchSafetyCount(),
        fetchSurgeCount(),
        fetchTatkalCount()
      ]);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load overview metrics:', err);
      setError(true);
    }
  }, [fetchComplaintsCount, fetchSafetyCount, fetchSurgeCount, fetchTatkalCount]);

  useEffect(() => {
    // Initial fetch
    const timer = setTimeout(() => {
      fetchAllMetrics();
    }, 0);

    // Setup Supabase realtime subscriptions
    const channel = supabase
      .channel('overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        fetchComplaintsCount();
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_events' }, () => {
        fetchSafetyCount();
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'travel_intents' }, () => {
        fetchSurgeCount();
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tatkal_requests' }, () => {
        fetchTatkalCount();
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [
    fetchAllMetrics,
    fetchComplaintsCount,
    fetchSafetyCount,
    fetchSurgeCount,
    fetchTatkalCount
  ]);

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Overview</h1>
          <p style={styles.subheading}>Live platform data — updates in real time</p>
        </div>
        <button style={styles.refreshBtn} onClick={fetchAllMetrics}>
          <RefreshCw size={14} style={{ marginRight: '8px' }} />
          Refresh
        </button>
      </div>

      {/* Grid layout */}
      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorText}>Something went wrong. Please refresh the page.</span>
          <button style={styles.retryBtn} onClick={fetchAllMetrics}>
            Retry
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          <KPICard
            title="Total Complaints Today"
            value={complaintsCount}
            icon={FileEdit}
            colour="var(--color-orange)"
            description="Complaints filed since midnight"
            isLoading={loading.complaints}
          />
          <KPICard
            title="Active SOS Alerts"
            value={safetyCount}
            icon={ShieldAlert}
            colour="var(--color-sos)"
            description="Unresolved SOS incidents"
            isLoading={loading.safety}
          />
          <KPICard
            title="Demand Surge Routes"
            value={surgeCount}
            icon={TrendingUp}
            colour="#F5A623"
            description="Routes with high booking intent"
            isLoading={loading.surge}
          />
          <KPICard
            title="Tatkal Urgency Requests"
            value={tatkalCount}
            icon={Clock}
            colour="var(--color-navy)"
            description="High-priority Tatkal queued"
            isLoading={loading.tatkal}
          />
        </div>
      )}

      {/* Footer section */}
      <footer style={styles.footer}>
        <span>Last updated: {lastUpdated}</span>
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
    color: 'var(--color-text-primary)',
    marginBottom: '4px',
  },
  subheading: {
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--color-orange)',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    color: 'var(--color-white)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    outline: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px',
  },
  footer: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    marginTop: '8px',
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
