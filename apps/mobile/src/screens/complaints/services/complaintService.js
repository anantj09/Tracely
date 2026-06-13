import apiClient from '../../../services/apiClient';
import { API_BASE_URL } from '../../../constants';

// ─── Authenticated endpoints (use apiClient — auto-attaches JWT) ─────────────

/**
 * File a new complaint
 * @param {Object} data - complaint payload
 * @returns {Promise<{data: Object, message: string}>}
 */
export const fileComplaint = async (data) => {
  const response = await apiClient.post('/complaints', data);
  return response.data;
};

/**
 * Get list of current user's complaints
 * @param {Object} filters - optional { status, type }
 * @returns {Promise<{data: Array, message: string}>}
 */
export const getMyComplaints = async (filters = {}) => {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.type) params.type = filters.type;
  const response = await apiClient.get('/complaints', { params });
  return response.data;
};

/**
 * Get a single complaint with full timeline
 * @param {string} id - complaint UUID
 * @returns {Promise<{data: Object, message: string}>}
 */
export const getComplaint = async (id) => {
  const response = await apiClient.get(`/complaints/${id}`);
  return response.data;
};

/**
 * Update complaint status (admin action)
 * @param {string} id - complaint UUID
 * @param {Object} data - { new_status, note? }
 */
export const updateComplaintStatus = async (id, data) => {
  const response = await apiClient.patch(`/complaints/${id}/status`, data);
  return response.data;
};

/**
 * Reopen a resolved complaint
 * @param {string} id - complaint UUID
 * @param {Object} data - { description }
 */
export const reopenComplaint = async (id, data) => {
  const response = await apiClient.post(`/complaints/${id}/reopen`, data);
  return response.data;
};

// ─── Public endpoints (no auth — use raw fetch) ───────────────────────────────

/**
 * Get heatmap data (no login required)
 */
export const getHeatmapData = async () => {
  const response = await fetch(`${API_BASE_URL}/complaints/public/heatmap`);
  if (!response.ok) throw new Error('Failed to fetch heatmap data');
  return response.json();
};

/**
 * Get public platform stats (no login required)
 */
export const getPublicStats = async () => {
  const response = await fetch(`${API_BASE_URL}/complaints/public/stats`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

/**
 * Get train routes aggregated data for heatmap (no login required)
 */
export const getTrainRoutesData = async (type = 'All', range = 'Last 30 days') => {
  const response = await fetch(`${API_BASE_URL}/complaints/public/train-routes?type=${type}&range=${range}`);
  if (!response.ok) throw new Error('Failed to fetch train routes data');
  return response.json();
};
