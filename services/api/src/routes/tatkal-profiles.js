// services/api/src/routes/tatkal-profiles.js
// Sub-router for IRCTC profile syncing and passenger lookups under /api/tatkal
// Path: services/api/src/routes/tatkal-profiles.js

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const supabase = require('../db/supabase-client');
const userDb = require('../db/user-db');

// express-validator rules for linking IRCTC account
const linkIrctcValidation = [
  body('irctc_username')
    .isString().trim().notEmpty().withMessage('irctc_username is required'),
  body('irctc_password')
    .optional().isString().withMessage('irctc_password must be a string'),
  body('passengers')
    .optional().isArray().withMessage('passengers must be an array of passenger details')
];

// express-validator rules for passenger auto-fetch lookup
const passengerByIrctcValidation = [
  query('irctc_username')
    .isString().trim().notEmpty().withMessage('irctc_username query parameter is required')
];

// POST /link-irctc - Link/sync an IRCTC account with passenger profile metadata
router.post('/link-irctc', verifyToken, linkIrctcValidation, async (req, res, next) => {
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
    const { irctc_username, irctc_password, passengers = [] } = req.body;

    const record = {
      user_id: userId,
      irctc_username,
      irctc_password: irctc_password || null,
      metadata: { passengers },
      is_verified: true,
      updated_at: new Date().toISOString()
    };

    // Upsert into tatkal_irctc_profiles using unique user_id + irctc_username constraint
    const { data: profile, error } = await supabase
      .from('tatkal_irctc_profiles')
      .upsert(record, { onConflict: 'user_id,irctc_username' })
      .select()
      .single();

    if (error) {
      console.error('[PROFILES] Database error syncing IRCTC account:', error.message);
      return res.status(500).json({ error: 'Failed to link IRCTC profile', code: 'SERVER_ERROR' });
    }

    // Automatically set the passenger profile as verified in the users table
    try {
      await userDb.updateUser(userId, { is_verified: true });
    } catch (dbErr) {
      console.warn('[PROFILES] Warning: Failed to set users.is_verified to true:', dbErr.message);
    }

    return res.status(200).json({
      data: profile,
      message: 'IRCTC account linked successfully.'
    });
  } catch (err) {
    next(err);
  }
});

// GET /passenger-by-irctc - Auto-fetch passenger list for a synced IRCTC account
router.get('/passenger-by-irctc', verifyToken, passengerByIrctcValidation, async (req, res, next) => {
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
    const { irctc_username } = req.query;

    const { data: profile, error } = await supabase
      .from('tatkal_irctc_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('irctc_username', irctc_username)
      .maybeSingle();

    if (error) {
      console.error('[PROFILES] Database error searching linked IRCTC profile:', error.message);
      return res.status(500).json({ error: 'Failed to search linked IRCTC profile', code: 'SERVER_ERROR' });
    }

    if (!profile) {
      return res.status(404).json({
        error: 'No linked IRCTC account found with that username.',
        code: 'NOT_FOUND'
      });
    }

    // Retrieve passengers from synced metadata
    let passengers = profile.metadata ? profile.metadata.passengers : [];

    // Fallback if passenger array is empty/missing
    if (!Array.isArray(passengers) || passengers.length === 0) {
      const user = await userDb.getUserById(userId);
      passengers = [
        {
          name: user ? user.name : 'Unknown Passenger',
          age: 30, // Default fallback age
          gender: 'M', // Default fallback gender
          berth_preference: 'LB' // Default fallback berth preference
        }
      ];
    }

    return res.status(200).json({
      data: passengers,
      message: 'ok'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
