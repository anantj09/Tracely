import apiClient from '../../../services/apiClient';

/**
 * Mobile safety service wrappers for interacting with the backend safety routes.
 */

export const postSOS = (data) => {
  return apiClient.post('/safety/sos', data);
};

export const postCompartmentAlert = (data) => {
  return apiClient.post('/safety/compartment', data);
};

export const postHazardReport = (data) => {
  return apiClient.post('/safety/hazard', data);
};

export const getContacts = () => {
  return apiClient.get('/safety/contacts');
};

export const addContact = (data) => {
  return apiClient.post('/safety/contacts', data);
};

export const deleteContact = (id) => {
  return apiClient.delete(`/safety/contacts/${id}`);
};

export const getMyEvents = () => {
  return apiClient.get('/safety/my-events');
};

export const getPublicMapEvents = (params) => {
  return apiClient.get('/safety/public/map', { params });
};

export const patchSOSAudio = (id, audioUrl) => {
  return apiClient.patch(`/safety/sos/${id}/audio`, { audio_url: audioUrl });
};

