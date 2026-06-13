// scripts/seed-data.js
// Static data for database seeding.

const STATIONS = [
  { code: 'NDLS', name: 'New Delhi', lat: 28.6415, lng: 77.2193 },
  { code: 'MMCT', name: 'Mumbai Central', lat: 18.9696, lng: 72.8193 },
  { code: 'HWH', name: 'Howrah', lat: 22.5834, lng: 88.3385 },
  { code: 'SBC', name: 'KSR Bengaluru', lat: 12.9784, lng: 77.5694 },
  { code: 'MAS', name: 'Chennai Central', lat: 13.0827, lng: 80.2707 },
  { code: 'PUNE', name: 'Pune Jn', lat: 18.5289, lng: 73.8744 },
  { code: 'AMD', name: 'Ahmedabad', lat: 23.0276, lng: 72.5996 },
  { code: 'BPL', name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  { code: 'LKO', name: 'Lucknow', lat: 26.8322, lng: 80.9220 },
  { code: 'JP', name: 'Jaipur', lat: 26.9196, lng: 75.7878 },
  { code: 'VSKP', name: 'Visakhapatnam', lat: 17.7262, lng: 83.2986 },
  { code: 'BZA', name: 'Vijayawada', lat: 16.5183, lng: 80.6202 },
  { code: 'SC', name: 'Secunderabad', lat: 17.4344, lng: 78.5011 },
  { code: 'ADI', name: 'Ahmedabad Jn', lat: 23.0289, lng: 72.6011 },
  { code: 'GKP', name: 'Gorakhpur', lat: 26.7606, lng: 83.3731 },
  { code: 'PNBE', name: 'Patna Jn', lat: 25.6022, lng: 85.1376 },
  { code: 'DBRG', name: 'Dibrugarh', lat: 27.4728, lng: 94.9120 },
  { code: 'UBL', name: 'Hubballi', lat: 15.3444, lng: 75.1478 },
  { code: 'MYS', name: 'Mysuru', lat: 12.3164, lng: 76.6465 },
  { code: 'CBE', name: 'Coimbatore', lat: 11.0003, lng: 76.9672 }
];

const ROUTES = [
  { origin: 'NDLS', dest: 'MMCT', latMin: 19.0, latMax: 28.0, lngMin: 72.0, lngMax: 77.0 },
  { origin: 'NDLS', dest: 'HWH', latMin: 22.0, latMax: 28.0, lngMin: 77.0, lngMax: 88.0 },
  { origin: 'SBC', dest: 'MAS', latMin: 12.9, latMax: 13.1, lngMin: 77.5, lngMax: 80.3 },
  { origin: 'MAS', dest: 'HYB', latMin: 13.0, latMax: 17.4, lngMin: 78.5, lngMax: 80.3 },
  { origin: 'AMD', dest: 'MMCT', latMin: 19.0, latMax: 23.0, lngMin: 72.5, lngMax: 72.9 },
  { origin: 'NDLS', dest: 'LKO', latMin: 26.8, latMax: 28.6, lngMin: 77.2, lngMax: 80.9 },
  { origin: 'HWH', dest: 'BBS', latMin: 20.3, latMax: 22.6, lngMin: 85.8, lngMax: 88.3 },
  { origin: 'SBC', dest: 'HYB', latMin: 12.9, latMax: 17.4, lngMin: 77.5, lngMax: 78.5 }
];

const SAFETY_ROUTES = [
  ...ROUTES,
  { origin: 'PNBE', dest: 'HWH', latMin: 22.5, latMax: 25.6, lngMin: 85.1, lngMax: 88.3 },
  { origin: 'NDLS', dest: 'BPL', latMin: 23.2, latMax: 28.6, lngMin: 77.2, lngMax: 77.4 }
];

const TRAINS = [
  { num: '12951', name: 'Mumbai Rajdhani', from: 'NDLS', to: 'MMCT' },
  { num: '12301', name: 'Howrah Rajdhani', from: 'NDLS', to: 'HWH' },
  { num: '12627', name: 'Karnataka Express', from: 'SBC', to: 'NDLS' },
  { num: '12628', name: 'Karnataka Express', from: 'NDLS', to: 'SBC' },
  { num: '12002', name: 'New Delhi Shatabdi', from: 'NDLS', to: 'BPL' },
  { num: '12952', name: 'Mumbai Rajdhani', from: 'MMCT', to: 'NDLS' },
  { num: '12260', name: 'Sealdah Duronto', from: 'NDLS', to: 'SDAH' },
  { num: '12840', name: 'Howrah Mail', from: 'MAS', to: 'HWH' },
  { num: '12723', name: 'Telangana Express', from: 'HYB', to: 'NDLS' },
  { num: '12431', name: 'Rajdhani Express', from: 'TVC', to: 'NZM' }
];

const NAMES = [
  'Aarav', 'Vihaan', 'Aditya', 'Sai', 'Arjun', 'Rohan', 'Dia', 'Sanya',
  'Ishaan', 'Rahul', 'Ananya', 'Zara', 'Meera', 'Riya', 'Karan', 'Dev',
  'Neha', 'Kabir', 'Kriti'
];

const ADMINS = [
  { email: 'admin@tracely.gov.in', role: 'superadmin', zone: 'ALL' },
  { email: 'zone1@tracely.gov.in', role: 'zone_officer', zone: 'Northern Zone' },
  { email: 'viewer@tracely.gov.in', role: 'viewer', zone: 'Southern Zone' }
];

module.exports = {
  STATIONS,
  ROUTES,
  SAFETY_ROUTES,
  TRAINS,
  NAMES,
  ADMINS
};
