import { useState, useCallback } from 'react';
import { getMyEvents } from '../services/safetyService';

/**
 * useSafety — provides safety event list state and fetch logic.
 * Returns: { events, loading, error, refresh }
 */
export function useSafety() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyEvents();
      const data = res?.data?.data || res?.data || [];
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      const isNetErr = err.code === 'ECONNABORTED' || !err.response;
      setError(isNetErr
        ? 'Could not connect. Check your connection.'
        : err.response?.data?.error || 'Failed to load safety events.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, refresh };
}
