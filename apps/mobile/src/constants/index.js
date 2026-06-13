import Constants from 'expo-constants';

// Set EXPO_PUBLIC_API_BASE_URL in .env for the deployed Render URL
// Use .env.local for local development (localhost:3000)
const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  // If we have an env variable pointing to a production/cloud server, use it.
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // Otherwise, dynamically fetch the host machine IP where Metro is running
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  
  return `http://${host}:3000/api`;
};

export const API_BASE_URL = getBaseUrl();

export const SCREENS = {
  LOGIN: 'Login',
  OTP_VERIFY: 'OTPVerify',
  REGISTER: 'Register',
  PROFILE_SETUP: 'ProfileSetup',
  HOME: 'Home',
  TATKAL: 'Tatkal',
  COMPLAINTS: 'Complaints',
  SAFETY: 'Safety',
  STATION: 'Station',
  COMPLAINTS_HOME: 'ComplaintsHome',
  NEW_COMPLAINT: 'NewComplaint',
  COMPLAINT_DETAIL: 'ComplaintDetail',
  REOPEN: 'Reopen',
  PUBLIC_HEAT_MAP: 'PublicHeatMap',
  STATION_HOME: 'StationHome',
  STATION_DETAIL: 'StationDetail',
  STATION_MAP: 'StationMap',
  TATKAL_HOME: 'TatkalHome',
  TATKAL_SURRENDER_MARKET: 'TatkalSurrenderMarket',
  TATKAL_PREFILL: 'TatkalPrefill',
  TATKAL_COUNTDOWN: 'TatkalCountdown',
  TATKAL_CONFIRMATION: 'TatkalConfirmation',
  SAFETY_HOME: 'SafetyHomeScreen',
  SOS_ACTIVE: 'SOSActive',
  COMPARTMENT_ALERT: 'CompartmentAlert',
  HAZARD_REPORT: 'HazardReport',
  SAFETY_MAP: 'SafetyMap',
  TRUSTED_CONTACTS: 'TrustedContacts',
  MY_EVENTS: 'MyEvents',
};

export const COLORS = {
  brandOrange: '#E8621A',
  brandNavy: '#1A3557',
  pageWhite: '#FFFFFF',
  surfaceGrey: '#F5F5F5',
  dividerGrey: '#E0E0E0',
  textPrimary: '#111111',
  textSecondary: '#555555',
  placeholderText: '#AAAAAA',
};
