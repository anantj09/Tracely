// scripts/seed-stations.js
// Seeds the database with the coordinates of 50 key Indian railway stations.
// Safe to re-run (idempotent upsert).

const fs = require('fs');
const path = require('path');

// Load environment variables from services/api/.env
const apiEnvPath = path.join(__dirname, '../services/api/.env');
if (fs.existsSync(apiEnvPath)) {
  require('dotenv').config({ path: apiEnvPath });
} else {
  require('dotenv').config();
}

const isMock = !process.env.SUPABASE_URL ||
               process.env.SUPABASE_URL.includes('mockproject.supabase.co') ||
               !process.env.SUPABASE_SERVICE_KEY ||
               process.env.SUPABASE_SERVICE_KEY.includes('mock');

const STATIONS = [
  // First 20 stations (from ARCHITECTURE.md)
  { station_code: 'NDLS', station_name: 'New Delhi', city: 'New Delhi', state: 'Delhi', lat: 28.6419, lng: 77.2194, zone: 'NR' },
  { station_code: 'MMCT', station_name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra', lat: 18.9688, lng: 72.8195, zone: 'WR' },
  { station_code: 'MAS', station_name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, zone: 'SR' },
  { station_code: 'HWH', station_name: 'Howrah Junction', city: 'Howrah', state: 'West Bengal', lat: 22.5839, lng: 88.3424, zone: 'ER' },
  { station_code: 'SBC', station_name: 'Bengaluru City', city: 'Bengaluru', state: 'Karnataka', lat: 12.9767, lng: 77.5713, zone: 'SWR' },
  { station_code: 'ADI', station_name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0258, lng: 72.6017, zone: 'WR' },
  { station_code: 'PUNE', station_name: 'Pune Junction', city: 'Pune', state: 'Maharashtra', lat: 18.5196, lng: 73.8553, zone: 'CR' },
  { station_code: 'LKO', station_name: 'Lucknow', city: 'Lucknow', state: 'UP', lat: 26.8352, lng: 80.9049, zone: 'NR' },
  { station_code: 'JP', station_name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, zone: 'NWR' },
  { station_code: 'BPL', station_name: 'Bhopal Junction', city: 'Bhopal', state: 'MP', lat: 23.2646, lng: 77.4139, zone: 'WCR' },
  { station_code: 'PNBE', station_name: 'Patna Junction', city: 'Patna', state: 'Bihar', lat: 25.6102, lng: 85.1399, zone: 'ECR' },
  { station_code: 'GHY', station_name: 'Guwahati', city: 'Guwahati', state: 'Assam', lat: 26.1842, lng: 91.7511, zone: 'NFR' },
  { station_code: 'HYB', station_name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana', lat: 17.3924, lng: 78.4709, zone: 'SCR' },
  { station_code: 'JAT', station_name: 'Jammu Tawi', city: 'Jammu', state: 'J&K', lat: 32.7266, lng: 74.8570, zone: 'NR' },
  { station_code: 'VSKP', station_name: 'Visakhapatnam', city: 'Vizag', state: 'AP', lat: 17.6887, lng: 83.2185, zone: 'ECoR' },
  { station_code: 'CNB', station_name: 'Kanpur Central', city: 'Kanpur', state: 'UP', lat: 26.4498, lng: 80.3319, zone: 'NCR' },
  { station_code: 'AGC', station_name: 'Agra Cantt', city: 'Agra', state: 'UP', lat: 27.1592, lng: 77.9858, zone: 'NCR' },
  { station_code: 'UDZ', station_name: 'Udaipur City', city: 'Udaipur', state: 'Rajasthan', lat: 24.5718, lng: 73.6791, zone: 'NWR' },
  { station_code: 'CSTM', station_name: 'Mumbai CST', city: 'Mumbai', state: 'Maharashtra', lat: 18.9401, lng: 72.8357, zone: 'CR' },
  { station_code: 'SC', station_name: 'Secunderabad', city: 'Hyderabad', state: 'Telangana', lat: 17.4344, lng: 78.5013, zone: 'SCR' },

  // Next 30 stations
  { station_code: 'MFP', station_name: 'Muzaffarpur Junction', city: 'Muzaffarpur', state: 'Bihar', lat: 26.1197, lng: 85.3910, zone: 'ECR' },
  { station_code: 'GAYA', station_name: 'Gaya Junction', city: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 85.0002, zone: 'ECR' },
  { station_code: 'DHN', station_name: 'Dhanbad Junction', city: 'Dhanbad', state: 'Jharkhand', lat: 23.7957, lng: 86.4304, zone: 'ECR' },
  { station_code: 'RNC', station_name: 'Ranchi Junction', city: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096, zone: 'SER' },
  { station_code: 'BSB', station_name: 'Varanasi Junction', city: 'Varanasi', state: 'UP', lat: 25.3176, lng: 82.9739, zone: 'NR' },
  { station_code: 'ALD', station_name: 'Prayagraj Junction', city: 'Prayagraj', state: 'UP', lat: 25.4358, lng: 81.8463, zone: 'NCR' },
  { station_code: 'GKP', station_name: 'Gorakhpur Junction', city: 'Gorakhpur', state: 'UP', lat: 26.7606, lng: 83.3732, zone: 'NER' },
  { station_code: 'LDH', station_name: 'Ludhiana Junction', city: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573, zone: 'NR' },
  { station_code: 'ASR', station_name: 'Amritsar Junction', city: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723, zone: 'NR' },
  { station_code: 'DLI', station_name: 'Old Delhi Junction', city: 'New Delhi', state: 'Delhi', lat: 28.6562, lng: 77.2273, zone: 'NR' },
  { station_code: 'NZM', station_name: 'Hazrat Nizamuddin', city: 'New Delhi', state: 'Delhi', lat: 28.5877, lng: 77.2518, zone: 'NR' },
  { station_code: 'BCT', station_name: 'Bandra Terminus', city: 'Mumbai', state: 'Maharashtra', lat: 19.0544, lng: 72.8405, zone: 'WR' },
  { station_code: 'DR', station_name: 'Dadar', city: 'Mumbai', state: 'Maharashtra', lat: 19.0186, lng: 72.8421, zone: 'CR' },
  { station_code: 'KYN', station_name: 'Kalyan Junction', city: 'Kalyan', state: 'Maharashtra', lat: 19.2403, lng: 73.1305, zone: 'CR' },
  { station_code: 'ST', station_name: 'Surat', city: 'Surat', state: 'Gujarat', lat: 21.2060, lng: 72.8311, zone: 'WR' },
  { station_code: 'BRC', station_name: 'Vadodara Junction', city: 'Vadodara', state: 'Gujarat', lat: 22.3119, lng: 73.1723, zone: 'WR' },
  { station_code: 'RTM', station_name: 'Ratlam Junction', city: 'Ratlam', state: 'MP', lat: 23.3315, lng: 75.0367, zone: 'WR' },
  { station_code: 'SWM', station_name: 'Sawai Madhopur', city: 'Sawai Madhopur', state: 'Rajasthan', lat: 26.0144, lng: 76.3530, zone: 'WCR' },
  { station_code: 'AJM', station_name: 'Ajmer Junction', city: 'Ajmer', state: 'Rajasthan', lat: 26.4499, lng: 74.6399, zone: 'NWR' },
  { station_code: 'JU', station_name: 'Jodhpur Junction', city: 'Jodhpur', state: 'Rajasthan', lat: 26.2948, lng: 73.0351, zone: 'NWR' },
  { station_code: 'BKN', station_name: 'Bikaner Junction', city: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lng: 73.3119, zone: 'NWR' },
  { station_code: 'JSM', station_name: 'Jaisalmer', city: 'Jaisalmer', state: 'Rajasthan', lat: 26.9157, lng: 70.9083, zone: 'NWR' },
  { station_code: 'CDG', station_name: 'Chandigarh', city: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794, zone: 'NR' },
  { station_code: 'HRI', station_name: 'Hisar', city: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217, zone: 'NR' },
  { station_code: 'UMB', station_name: 'Ambala Cantt', city: 'Ambala', state: 'Haryana', lat: 30.3782, lng: 76.8270, zone: 'NR' },
  { station_code: 'SRE', station_name: 'Saharanpur', city: 'Saharanpur', state: 'UP', lat: 29.9640, lng: 77.5460, zone: 'NR' },
  { station_code: 'MTJ', station_name: 'Mathura Junction', city: 'Mathura', state: 'UP', lat: 27.4924, lng: 77.6737, zone: 'NCR' },
  { station_code: 'AF', station_name: 'Agra Fort', city: 'Agra', state: 'UP', lat: 27.1767, lng: 78.0081, zone: 'NCR' },
  { station_code: 'TVC', station_name: 'Thiruvananthapuram', city: 'Thiruvananthapuram', state: 'Kerala', lat: 8.4875, lng: 76.9525, zone: 'SR' },
  { station_code: 'CBE', station_name: 'Coimbatore Junction', city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0018, lng: 76.9629, zone: 'SR' }
];

async function seed() {
  try {
    console.log('Starting station coordinates seeding...');
    if (isMock) {
      console.log('Running in MOCK mode (mock or missing Supabase credentials)');
      for (const station of STATIONS) {
        console.log(`Inserting/Upserting station: ${station.station_code}`);
      }
      console.log(`✅ Seeded ${STATIONS.length} station records successfully`);
      process.exit(0);
    }

    // Load supabase client
    const supabase = require('../services/api/src/db/supabase-client');

    console.log('Connecting to live Supabase database...');
    for (const station of STATIONS) {
      console.log(`Inserting/Upserting station: ${station.station_code}`);
    }

    const { error } = await supabase
      .from('station_coordinates')
      .upsert(STATIONS, { onConflict: 'station_code' });

    if (error) {
      throw error;
    }

    console.log(`✅ Seeded ${STATIONS.length} station records successfully`);
    process.exit(0);
  } catch (err) {
    console.error('✖ Station seeding failed:', err.message || err);
    process.exit(1);
  }
}

seed();
