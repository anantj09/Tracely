// services/api/src/routes/tatkal.js
// Root router for the Tatkal module.
// Path: services/api/src/routes/tatkal.js

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const supabase = require('../db/supabase-client');
const userDb = require('../db/user-db');

const {
  calculateUrgencyScore,
  calculateFireTime,
  checkJourneyOverlap,
  validatePassengerList
} = require('../services/tatkal-service');

// express-validator rules for /prefill
const prefillValidation = [
  body('from_station')
    .isString().isLength({ min: 2, max: 10 }).withMessage('from_station must be 2-10 characters').trim().toUpperCase(),
  body('to_station')
    .isString().isLength({ min: 2, max: 10 }).withMessage('to_station must be 2-10 characters').trim().toUpperCase(),
  body('travel_date')
    .isISO8601().withMessage('travel_date must be a valid ISO8601 date (YYYY-MM-DD)')
    .custom((val) => {
      const input = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (input < today) {
        throw new Error('travel_date must be today or a future date');
      }
      return true;
    }),
  body('train_number')
    .isString().isLength({ min: 5, max: 5 }).isNumeric().withMessage('train_number must be a 5-digit numeric train code'),
  body('class')
    .isString().isIn(['SL', '3A', '2A', '1A', 'GEN']).withMessage('class must be one of: SL, 3A, 2A, 1A, GEN'),
  body('passengers')
    .isArray({ min: 1 }).withMessage('passengers list cannot be empty'),
  body('passengers.*.name')
    .isString().trim().notEmpty().withMessage('Each passenger must have a name'),
  body('passengers.*.age')
    .isInt({ min: 1, max: 120 }).withMessage('Passenger age must be between 1 and 120'),
  body('passengers.*.gender')
    .isString().isIn(['M', 'F', 'O']).withMessage('Passenger gender must be M, F, or O'),
  body('is_urgent')
    .optional().isBoolean().withMessage('is_urgent must be a boolean'),
  body('urgency_reason')
    .optional().isString().isIn(['medical', 'bereavement', 'official', 'personal']).withMessage('Invalid urgency_reason'),
  body('urgency_document_url')
    .optional().isString().withMessage('urgency_document_url must be a string'),
  body('departure_datetime')
    .optional().isISO8601().withMessage('departure_datetime must be a valid ISO8601 timestamp'),
  body('arrival_datetime')
    .optional().isISO8601().withMessage('arrival_datetime must be a valid ISO8601 timestamp')
];

// POST /prefill - Create a pre-filled booking request
router.post('/prefill', verifyToken, prefillValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }

  try {
    const userId = req.user.user_id;
    const {
      from_station,
      to_station,
      travel_date,
      train_number,
      class: trainClass,
      passengers,
      is_urgent = false,
      urgency_reason,
      urgency_document_url
    } = req.body;

    // 1. Fetch profile record for demographic / Account Holder Mandate check
    const user = await userDb.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found', code: 'USER_NOT_FOUND' });
    }

    // 2. Validate passenger list (limit to 4, case-insensitive account holder check)
    const passengerCheck = validatePassengerList(passengers, user.name);
    if (!passengerCheck.valid) {
      return res.status(400).json({
        error: passengerCheck.errors.join(' '),
        code: 'ACCOUNT_HOLDER_MANDATE_FAILED'
      });
    }

    // Calculate booking_date (today in IST)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(Date.now() + istOffset);
    const bookingDate = istTime.toISOString().split('T')[0];

    // 3. Anti-Hoarding Validation (one request per user per booking date per train_number)
    const { data: existing, error: hoardingError } = await supabase
      .from('tatkal_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('booking_date', bookingDate)
      .eq('train_number', train_number)
      .not('status', 'in', '("CANCELLED","FAILED")')
      .maybeSingle();

    if (hoardingError) {
      console.error('[TATKAL] Database error checking anti-hoarding:', hoardingError.message);
      return res.status(500).json({ error: 'Failed to verify booking limits', code: 'SERVER_ERROR' });
    }

    if (existing) {
      return res.status(409).json({
        error: 'You already have an active Tatkal request for today.',
        code: 'DUPLICATE_REQUEST'
      });
    }

    // Derive departure/arrival datetimes if missing
    let dep = req.body.departure_datetime;
    let arr = req.body.arrival_datetime;
    if (!dep || !arr) {
      const parts = travel_date.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!dep) dep = new Date(Date.UTC(y, m, d, 2, 30, 0)).toISOString(); // 08:00 AM IST
      if (!arr) arr = new Date(Date.UTC(y, m, d, 14, 30, 0)).toISOString(); // 08:00 PM IST
    }

    // 4. Journey Overlap Validation
    const { data: locks, error: locksError } = await supabase
      .from('tatkal_journey_locks')
      .select('*')
      .eq('user_id', userId);

    if (locksError) {
      console.error('[TATKAL] Database error querying journey locks:', locksError.message);
      return res.status(500).json({ error: 'Failed to verify travel schedule overlaps', code: 'SERVER_ERROR' });
    }

    const passengerNames = passengers.map(p => p.name.trim().toLowerCase());
    let overlapFound = null;

    if (locks && locks.length > 0) {
      for (const lock of locks) {
        if (passengerNames.includes(lock.passenger_name.trim().toLowerCase())) {
          const overlaps = checkJourneyOverlap(lock.lock_start, lock.lock_end, dep, arr);
          if (overlaps) {
            overlapFound = lock;
            break;
          }
        }
      }
    }

    if (overlapFound) {
      return res.status(409).json({
        error: `Journey overlap detected: Passenger ${overlapFound.passenger_name} is already locked under PNR ${overlapFound.pnr}.`,
        code: 'JOURNEY_OVERLAP_LOCK',
        details: {
          passenger_name: overlapFound.passenger_name,
          pnr: overlapFound.pnr,
          lock_start: overlapFound.lock_start,
          lock_end: overlapFound.lock_end
        }
      });
    }

    // Calculate urgency score
    const createdDate = new Date(user.created_at || new Date());
    const accountAgeMonths = (new Date().getFullYear() - createdDate.getFullYear()) * 12 + (new Date().getMonth() - createdDate.getMonth());
    const hasDoc = !!urgency_document_url;
    const urgencyScore = is_urgent ? calculateUrgencyScore(urgency_reason, hasDoc, accountAgeMonths) : 0.0;

    // Calculate fire time
    const scheduledFireTime = calculateFireTime(travel_date, trainClass);

    // 5. Persist payload
    const record = {
      user_id: userId,
      from_station,
      to_station,
      travel_date,
      train_number,
      class: trainClass,
      passengers,
      is_urgent,
      urgency_reason: is_urgent ? urgency_reason : null,
      urgency_document_url: is_urgent ? urgency_document_url : null,
      urgency_score: urgencyScore,
      scheduled_fire_time: scheduledFireTime,
      status: 'PENDING',
      booking_date: bookingDate,
      departure_datetime: dep,
      arrival_datetime: arr
    };

    const { data: request, error: insertError } = await supabase
      .from('tatkal_requests')
      .insert(record)
      .select()
      .single();

    if (insertError) {
      console.error('[TATKAL] Database error inserting prefill request:', insertError.message);
      return res.status(500).json({ error: 'Failed to save prefill request', code: 'SERVER_ERROR' });
    }

    return res.status(201).json({
      data: request,
      message: `Pre-fill saved. Will fire at ${new Date(scheduledFireTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} tomorrow.`
    });

  } catch (err) {
    next(err);
  }
});

// POST /fire/:id - Manually trigger the fire simulation for demo purposes
router.post('/fire/:id', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const requestId = req.params.id;

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(requestId)) {
      return res.status(400).json({ error: 'Invalid ID format. Must be a valid UUID.', code: 'INVALID_ID_FORMAT' });
    }

    // 1. Fetch request and verify ownership
    const { data: request, error: fetchError } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError) {
      console.error('[TATKAL] Database error fetching request for firing:', fetchError.message);
      return res.status(500).json({ error: 'Database retrieval error', code: 'SERVER_ERROR' });
    }

    if (!request) {
      return res.status(404).json({ error: 'Tatkal request not found', code: 'NOT_FOUND' });
    }

    if (request.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to fire this request', code: 'FORBIDDEN' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Only pending requests can be fired.',
        code: 'INVALID_STATUS'
      });
    }

    // 2. Set to FIRED
    const { error: firedUpdateError } = await supabase
      .from('tatkal_requests')
      .update({ status: 'FIRED', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (firedUpdateError) {
      console.error('[TATKAL] Failed to update request to FIRED status:', firedUpdateError.message);
      return res.status(500).json({ error: 'Failed to update fire state', code: 'SERVER_ERROR' });
    }

    // 3. Simulate 2-second transaction latency
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Update status to CONFIRMED and generate PNR
    const simulatedPnr = 'DEMO' + Math.floor(100000 + Math.random() * 900000);
    const { data: confirmedRequest, error: confirmUpdateError } = await supabase
      .from('tatkal_requests')
      .update({
        status: 'CONFIRMED',
        simulated_pnr: simulatedPnr,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (confirmUpdateError) {
      console.error('[TATKAL] Failed to update request to CONFIRMED status:', confirmUpdateError.message);
      return res.status(500).json({ error: 'Failed to confirm request', code: 'SERVER_ERROR' });
    }

    // 5. Create journey locks for all passengers on this request
    const passengers = Array.isArray(confirmedRequest.passengers) ? confirmedRequest.passengers : [];
    if (passengers.length > 0) {
      const locks = passengers.map(p => ({
        user_id: userId,
        passenger_name: p.name,
        pnr: simulatedPnr,
        lock_start: confirmedRequest.departure_datetime,
        lock_end: confirmedRequest.arrival_datetime
      }));

      const { error: locksInsertError } = await supabase
        .from('tatkal_journey_locks')
        .insert(locks);

      if (locksInsertError) {
        console.error('[TATKAL] Failed to insert passenger journey locks:', locksInsertError.message);
        // Non-blocking for the HTTP response, but log it
      }
    }

    return res.status(200).json({
      data: confirmedRequest,
      message: 'Booking request fired and confirmed.'
    });

  } catch (err) {
    next(err);
  }
});

// Mount modular sub-routers
router.use('/', require('./tatkal-surrenders'));
router.use('/', require('./tatkal-profiles'));
router.use('/', require('./tatkal-requests'));

module.exports = router;
