// services/api/src/services/tatkal-service.js
// Pure business logic functions for the Tatkal module.
// Strictly NO database operations, NO network calls, and NO side effects.

/**
 * Calculates the urgency score (range 1.0 to 10.0) based on the reason,
 * whether document evidence is attached, and the account age in months.
 *
 * @param {string} reason - medical | bereavement | official | personal
 * @param {boolean} hasDocument - whether evidence file was uploaded
 * @param {number} accountAgeMonths - how long the passenger has been registered
 * @returns {number} calculated score capped at 10.0
 */
function calculateUrgencyScore(reason, hasDocument, accountAgeMonths) {
  const baseScores = {
    medical: 9.0,
    bereavement: 8.0,
    official: 7.0,
    personal: 5.0
  };

  const normalizedReason = String(reason || '').trim().toLowerCase();
  let score = baseScores[normalizedReason] || 5.0;

  if (hasDocument === true) {
    score += 1.0;
  }

  const age = Number(accountAgeMonths) || 0;
  if (age > 6) {
    score += 0.5;
  }

  return Math.min(score, 10.0);
}

/**
 * Calculates the scheduled fire time for a Tatkal booking.
 * Opening rules:
 * - AC classes (1A, 2A, 3A, CC, EC, 3E): 10:00 AM IST (04:30 AM UTC) on travel_date - 1
 * - Non-AC classes (SL, FC, 2S, GEN): 11:00 AM IST (05:30 AM UTC) on travel_date - 1
 *
 * @param {string} travelDateStr - travel date in YYYY-MM-DD format
 * @param {string} trainClass - class code
 * @returns {string} ISO UTC string of the scheduled fire time
 */
function calculateFireTime(travelDateStr, trainClass) {
  if (!travelDateStr) {
    throw new Error('travelDateStr is required');
  }

  const parts = String(travelDateStr).split('-');
  if (parts.length !== 3) {
    throw new Error('travelDateStr must be in YYYY-MM-DD format');
  }

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    throw new Error('Invalid travelDateStr values');
  }

  // Create date in UTC to avoid local timezone offset inconsistencies
  const date = new Date(Date.UTC(y, m, d));
  
  // Firing window is exactly 1 day before the travel date
  date.setUTCDate(date.getUTCDate() - 1);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  const normalizedClass = String(trainClass || '').trim().toUpperCase();
  const acClasses = ['1A', '2A', '3A', 'CC', 'EC', '3E'];
  const isAC = acClasses.includes(normalizedClass);

  // 10:00 AM IST = 04:30:00 UTC
  // 11:00 AM IST = 05:30:00 UTC
  const timeStr = isAC ? '04:30:00.000Z' : '05:30:00.000Z';

  return `${year}-${month}-${day}T${timeStr}`;
}

/**
 * Checks if target journey time window overlaps with a locked journey window.
 * Formula: TargetStart < LockEnd && TargetEnd > LockStart
 *
 * @param {string|Date} lockStart - start of lock window
 * @param {string|Date} lockEnd - end of lock window
 * @param {string|Date} targetStart - start of target window
 * @param {string|Date} targetEnd - end of target window
 * @returns {boolean} true if overlapping, false otherwise
 */
function checkJourneyOverlap(lockStart, lockEnd, targetStart, targetEnd) {
  if (!lockStart || !lockEnd || !targetStart || !targetEnd) {
    return false;
  }

  const start1 = new Date(lockStart).getTime();
  const end1 = new Date(lockEnd).getTime();
  const start2 = new Date(targetStart).getTime();
  const end2 = new Date(targetEnd).getTime();

  if (isNaN(start1) || isNaN(end1) || isNaN(start2) || isNaN(end2)) {
    return false;
  }

  return start2 < end1 && end2 > start1;
}

/**
 * Formats date and time cleanly in Indian Standard Time (IST) format for warnings.
 *
 * @param {string|Date} departureTime - departure ISO timestamp
 * @param {string|Date} arrivalTime - arrival ISO timestamp
 * @returns {string} formatted window description
 */
function formatLockWindow(departureTime, arrivalTime) {
  const formatDate = (timeVal) => {
    const d = new Date(timeVal);
    if (isNaN(d.getTime())) return String(timeVal);
    
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return `${formatDate(departureTime)} to ${formatDate(arrivalTime)}`;
}

/**
 * Validates the passenger list for a Tatkal booking:
 * - Capped at exactly 4 passengers.
 * - Enforces that the account holder's name exists (case-insensitive, comparing up to 16 characters).
 *
 * @param {Array} passengers - array of passenger objects
 * @param {string} accountHolderName - name of the logged-in user
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validatePassengerList(passengers, accountHolderName) {
  const errors = [];

  if (!Array.isArray(passengers) || passengers.length === 0) {
    errors.push('Passenger list cannot be empty.');
    return { valid: false, errors };
  }

  if (passengers.length > 4) {
    errors.push('Tatkal booking is limited to a maximum of 4 passengers per request.');
  }

  if (!accountHolderName) {
    errors.push('Account holder name is required for verification.');
    return { valid: false, errors };
  }

  const truncateName = (name) => String(name || '').trim().substring(0, 16).toLowerCase();
  const targetHolderTruncated = truncateName(accountHolderName);

  const isHolderPresent = passengers.some((p) => {
    if (!p || !p.name) return false;
    const passengerTruncated = truncateName(p.name);
    return passengerTruncated === targetHolderTruncated;
  });

  if (!isHolderPresent) {
    errors.push('Account Holder Mandate failed: The account holder must be one of the passengers.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  calculateUrgencyScore,
  calculateFireTime,
  checkJourneyOverlap,
  formatLockWindow,
  validatePassengerList
};
