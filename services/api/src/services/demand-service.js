const CONFIRMED_BROKEN_THRESHOLD = 3;
const VOTE_WINDOW_HOURS = 2;
const CHECKIN_RADIUS_METRES = 500;
const SURGE_INTENT_THRESHOLD = 10;

const KNOWN_CONGESTED_ROUTES = {
  'MMCT-PUNE': { base: 8, label: 'Mumbai-Pune' },
  'PUNE-MMCT': { base: 8, label: 'Pune-Mumbai' },
  'NDLS-LKO':  { base: 7, label: 'Delhi-Lucknow' },
  'LKO-NDLS':  { base: 7, label: 'Lucknow-Delhi' },
  'NDLS-PNBE': { base: 7, label: 'Delhi-Patna' },
  'PNBE-NDLS': { base: 7, label: 'Patna-Delhi' },
  'CSTM-BSL':  { base: 7, label: 'Mumbai-Bhusawal' },
  'HWH-PNBE':  { base: 7, label: 'Howrah-Patna' },
  'MAS-BZA':   { base: 6, label: 'Chennai-Vijayawada' },
  'SBC-MAS':   { base: 6, label: 'Bengaluru-Chennai' },
  'ADI-MMCT':  { base: 5, label: 'Ahmedabad-Mumbai' },
  'NDLS-MMCT': { base: 7, label: 'Delhi-Mumbai' }
};

/**
 * Calculates a crowding score for a given route, date, and declared intent count.
 * Formula: Score = BASE_SCORE + DAY_MODIFIER + INTENT_MODIFIER, capped at 10.
 *
 * @param {string} fromStation
 * @param {string} toStation
 * @param {string} travelDate
 * @param {number} intentCount
 * @returns {number}
 */
function calculateCrowdingScore(fromStation, toStation, travelDate, intentCount) {
  const routeKey = `${fromStation}-${toStation}`;
  const base = KNOWN_CONGESTED_ROUTES[routeKey]?.base ?? 4;

  const date = new Date(travelDate);
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 5=Fri, 6=Sat

  let dayModifier = 0;
  if (dayOfWeek === 1 || dayOfWeek === 5) {
    dayModifier = 1.0;
  } else if (dayOfWeek === 0 || dayOfWeek === 6) {
    dayModifier = 0.5;
  }

  const intentModifier = Math.min(Math.floor(intentCount / 10) * 0.5, 2.0);

  let score = base + dayModifier + intentModifier;
  score = Math.min(score, 10.0);
  score = Math.max(score, 1.0);

  return Math.round(score * 10) / 10;
}

function getCrowdingLabel(score) {
  if (score >= 8) {
    return 'VERY_CROWDED';
  } else if (score >= 5) {
    return 'MODERATE';
  } else {
    return 'COMFORTABLE';
  }
}

function getAlternateTrains(fromStation, toStation) {
  const routeKey = `${fromStation}-${toStation}`;
  if (routeKey === 'NDLS-MMCT') {
    return [
      { train_number: '12953', name: 'August Kranti Rajdhani', estimated_crowding_score: 5.0 },
      { train_number: '12904', name: 'Golden Temple Mail', estimated_crowding_score: 6.5 }
    ];
  } else if (routeKey === 'NDLS-LKO') {
    return [
      { train_number: '12430', name: 'NDLS LKO AC SF', estimated_crowding_score: 4.5 },
      { train_number: '12230', name: 'Lucknow Mail', estimated_crowding_score: 5.5 }
    ];
  } else if (routeKey === 'ADI-MMCT') {
    return [
      { train_number: '12010', name: 'Shatabdi Express', estimated_crowding_score: 4.0 },
      { train_number: '12932', name: 'ADI MMCT Double Decker', estimated_crowding_score: 5.0 }
    ];
  } else if (routeKey === 'SBC-MAS') {
    return [
      { train_number: '12028', name: 'Shatabdi Express', estimated_crowding_score: 3.5 },
      { train_number: '12640', name: 'Brindavan Express', estimated_crowding_score: 5.0 }
    ];
  }
  return [];
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  calculateCrowdingScore,
  getCrowdingLabel,
  getAlternateTrains,
  haversineDistance,
  CONFIRMED_BROKEN_THRESHOLD,
  VOTE_WINDOW_HOURS,
  CHECKIN_RADIUS_METRES,
  SURGE_INTENT_THRESHOLD
};

// Self-test: node src/services/demand-service.js
// Test 1: calculateCrowdingScore('NDLS','MMCT','2026-06-16',25) → >= 8.0
// Test 2: calculateCrowdingScore('NDLS','MMCT','2026-06-18',0) → 7.0 (Wed, base 5 + no modifiers wrong — NDLS-MMCT base is 5, Wed=0, 0 intents=0 → 5.0)
// Test 3: haversineDistance(28.6419,77.2194,28.6419,77.2194) → 0
// Test 4: haversineDistance(28.6419,77.2194,28.6519,77.2294) → ~1400-1600m
