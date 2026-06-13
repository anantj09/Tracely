// services/api/src/services/complaint-service.js

// Valid complaint types
const VALID_COMPLAINT_TYPES = ['CLEANLINESS', 'AC_HEATING', 'STAFF', 'FOOD', 'SAFETY', 'OVERCROWDING', 'AMENITY', 'OTHER'];

// Valid status transitions — STRICT STATE MACHINE
const VALID_TRANSITIONS = {
  'SUBMITTED':    ['ACKNOWLEDGED', 'IN_PROGRESS', 'REJECTED'],
  'ACKNOWLEDGED': ['IN_PROGRESS'],
  'IN_PROGRESS':  ['RESOLVED', 'REJECTED'],
  'RESOLVED':     ['SUBMITTED'],  // reopen path only
  'REJECTED':     [],             // terminal state
};

/**
 * Generates a unique reference number in format RS-YYYYMMDD-XXXXX.
 * Uses server time and a random 5-digit integer.
 */
const generateReferenceNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(10000 + Math.random() * 90000); // 10000 to 99999 inclusive
  return `RS-${date}-${rand}`;
};

/**
 * Validates whether a status transition is permitted by the state machine.
 */
const validateStatusTransition = (fromStatus, toStatus) => {
  if (!VALID_TRANSITIONS.hasOwnProperty(fromStatus)) {
    return { valid: false, message: `Unknown current status: ${fromStatus}` };
  }
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (allowed.includes(toStatus)) {
    return { valid: true };
  }
  return { valid: false, message: `Invalid status transition: ${fromStatus} → ${toStatus}` };
};

/**
 * Calculates initial status and priority based on complaint type.
 */
const calculatePriorityAndStatus = (complaintType) => {
  if (complaintType === 'SAFETY') {
    return { status: 'IN_PROGRESS', priority: 'CRITICAL' };
  }
  return { status: 'SUBMITTED', priority: 'NORMAL' };
};

/**
 * Checks if a user is allowed to reopen a resolved complaint.
 * Must be within the 72-hour window and in RESOLVED status.
 */
const isReopenAllowed = (complaint) => {
  if (complaint.status !== 'RESOLVED') {
    return { allowed: false, reason: 'Complaint is not in RESOLVED status' };
  }
  if (new Date() >= new Date(complaint.reopen_deadline)) {
    return { allowed: false, reason: 'Reopen window has expired (72 hours)' };
  }
  return { allowed: true };
};

/**
 * Validates if the given complaint type is valid.
 */
const isValidComplaintType = (type) => {
  return VALID_COMPLAINT_TYPES.includes(type);
};

module.exports = {
  generateReferenceNumber,
  validateStatusTransition,
  calculatePriorityAndStatus,
  isReopenAllowed,
  isValidComplaintType,
  VALID_COMPLAINT_TYPES,
  VALID_TRANSITIONS
};
