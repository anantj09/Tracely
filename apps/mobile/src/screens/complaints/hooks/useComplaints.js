import { useState, useEffect, useCallback } from 'react';
import { getMyComplaints } from '../services/complaintService';

/**
 * Hook for managing the complaints list.
 * Provides: complaints, loading, error, refresh, filter state.
 */
export const useComplaints = (initialFilters = {}) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMyComplaints(filters);
      setComplaints(result.data || []);
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to load complaints';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return {
    complaints,
    loading,
    error,
    refresh: fetchComplaints,
    filters,
    setFilters,
  };
};
