import axios from 'axios';
import AsyncStorage from './asyncStorage';
import { API_BASE_URL } from '../constants';

// eslint-disable-next-line import/no-named-as-default-member
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let logoutHandler = null;

export const registerLogoutHandler = (handler) => {
  logoutHandler = handler;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await AsyncStorage.removeItem('token');
      if (logoutHandler) {
        logoutHandler();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
