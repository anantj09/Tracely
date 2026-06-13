// apps/mobile/src/screens/tatkal/services/tatkalService.js
// Client-side API Service Layer for Tatkal module.
// Path: apps/mobile/src/screens/tatkal/services/tatkalService.js

import apiClient from '../../../services/apiClient';

/**
 * Helper to process and normalize Axios errors so that the
 * UI components can cleanly catch and display backend error envelopes.
 */
const handleAxiosError = (error) => {
  if (error.response && error.response.data) {
    throw error.response.data;
  }
  throw {
    error: error.message || 'A network error occurred. Please check your connection.',
    code: 'NETWORK_ERROR'
  };
};

/**
 * Placeholder biometric check interceptor for the Tatkal booking fire workflow.
 * Feature holds and integration alternatives are documented under docs/member2/BIOMETRIC_HOLD.md.
 * In production, this will invoke LocalAuthentication.authenticateAsync().
 */
export const verifyBiometricsPlaceholder = async () => {
  console.log('[BIOMETRICS_HOLD] Intercepting transaction for biometric verification...');
  // Simulating device-level biometric check delay (500ms)
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('[BIOMETRICS_HOLD] Device biometric verification passed (STUB).');
  return true;
};

/**
 * POST /api/tatkal/prefill
 * Submit a pre-filled booking request.
 */
export const submitPrefill = async (payload) => {
  try {
    const response = await apiClient.post('/tatkal/prefill', payload);
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * GET /api/tatkal/my-requests
 * Retrieve all booking requests of the authenticated user.
 */
export const getMyRequests = async () => {
  try {
    const response = await apiClient.get('/tatkal/my-requests');
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * GET /api/tatkal/:id
 * Retrieve details of a specific Tatkal request.
 */
export const getRequestDetails = async (id) => {
  try {
    const response = await apiClient.get(`/tatkal/${id}`);
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * POST /api/tatkal/cancel/:id
 * Cancel an existing PENDING booking request.
 */
export const cancelRequest = async (id) => {
  try {
    const response = await apiClient.post(`/tatkal/cancel/${id}`);
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * POST /api/tatkal/fire/:id
 * Trigger the fire simulation for a specific pending request.
 * Enforces a device-level biometric check interceptor prior to firing.
 */
export const triggerDemoFire = async (id) => {
  try {
    // Intercept with the required biometric check placeholder
    await verifyBiometricsPlaceholder();
    const response = await apiClient.post(`/tatkal/fire/${id}`);
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * GET /api/tatkal/surrenders
 * Fetch active/listed surrender tickets from the marketplace.
 * Passes the query filters (from, to, date, class).
 */
export const fetchMarketplaceSurrenders = async (filters = {}) => {
  try {
    const response = await apiClient.get('/tatkal/surrenders', { params: filters });
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * POST /api/tatkal/surrender
 * List a confirmed ticket for surrender in the marketplace.
 */
export const listTicketSurrender = async (payload) => {
  try {
    const response = await apiClient.post('/tatkal/surrender', payload);
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * POST /api/tatkal/surrenders/:id/request
 * Request a listed surrender ticket for matchmaking.
 */
export const claimSurrenderTicket = async (id) => {
  try {
    const response = await apiClient.post(`/tatkal/surrenders/${id}/request`);
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * GET /api/tatkal/my-locks
 * Fetch active locks for the passenger.
 */
export const getMyActiveLocks = async () => {
  try {
    const response = await apiClient.get('/tatkal/my-locks');
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

/**
 * POST /api/tatkal/link-irctc
 * Link IRCTC credentials and passenger profiles.
 */
export const linkIrctcAccount = async (payload) => {
  try {
    const response = await apiClient.post('/tatkal/link-irctc', payload);
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};
