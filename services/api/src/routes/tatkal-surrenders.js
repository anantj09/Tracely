// services/api/src/routes/tatkal-surrenders.js
// Sub-router for surrender-related endpoints under /api/tatkal
// Path: services/api/src/routes/tatkal-surrenders.js

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const supabase = require('../db/supabase-client');

// express-validator rules for listing a surrender ticket
const surrenderValidation = [
  body('pnr')
    .isString().isLength({ min: 10, max: 10 }).isNumeric().withMessage('PNR must be a 10-digit numeric code'),
  body('from_station')
    .isString().isLength({ min: 2, max: 10 }).withMessage('from_station must be 2-10 characters').trim().toUpperCase(),
  body('to_station')
    .isString().isLength({ min: 2, max: 10 }).withMessage('to_station must be 2-10 characters').trim().toUpperCase(),
  body('travel_date')
    .isISO8601().withMessage('travel_date must be a valid ISO8601 date (YYYY-MM-DD)'),
  body('train_number')
    .isString().isLength({ min: 5, max: 5 }).isNumeric().withMessage('train_number must be a 5-digit numeric train code'),
  body('class')
    .isString().isIn(['SL', '3A', '2A', '1A', 'GEN']).withMessage('class must be one of: SL, 3A, 2A, 1A, GEN')
];

// express-validator rules for filtering surrenders
const surrendersFilterValidation = [
  query('from').optional().isString().trim().toUpperCase(),
  query('to').optional().isString().trim().toUpperCase(),
  query('date').optional().isISO8601().withMessage('date must be a valid ISO8601 date'),
  query('class').optional().isString().isIn(['SL', '3A', '2A', '1A', 'GEN']).withMessage('Invalid class value')
];

// POST /surrender - List a Tatkal ticket for surrender
router.post('/surrender', verifyToken, surrenderValidation, async (req, res, next) => {
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
      pnr,
      from_station,
      to_station,
      travel_date,
      train_number,
      class: trainClass
    } = req.body;

    const record = {
      owner_user_id: userId,
      pnr,
      from_station,
      to_station,
      travel_date,
      train_number,
      class: trainClass,
      status: 'LISTED'
    };

    const { data: surrender, error } = await supabase
      .from('tatkal_surrenders')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[SURRENDER] Database error listing ticket for surrender:', error.message);
      return res.status(500).json({ error: 'Failed to list ticket for surrender', code: 'SERVER_ERROR' });
    }

    return res.status(201).json({
      data: surrender,
      message: 'Ticket listed for surrender successfully.'
    });
  } catch (err) {
    next(err);
  }
});

// GET /surrenders - List all active/listed surrender tickets with optional filters
router.get('/surrenders', verifyToken, surrendersFilterValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid filter parameters',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }

  try {
    const { from, to, date, class: trainClass } = req.query;

    let queryBuilder = supabase
      .from('tatkal_surrenders')
      .select('*')
      .eq('status', 'LISTED');

    if (from) {
      queryBuilder = queryBuilder.eq('from_station', from);
    }
    if (to) {
      queryBuilder = queryBuilder.eq('to_station', to);
    }
    if (date) {
      queryBuilder = queryBuilder.eq('travel_date', date);
    }
    if (trainClass) {
      queryBuilder = queryBuilder.eq('class', trainClass);
    }

    const { data: surrenders, error } = await queryBuilder.order('listed_at', { ascending: false });

    if (error) {
      console.error('[SURRENDER] Database error fetching listed surrenders:', error.message);
      return res.status(500).json({ error: 'Failed to fetch surrender tickets', code: 'SERVER_ERROR' });
    }

    return res.status(200).json({
      data: surrenders || [],
      message: 'ok'
    });
  } catch (err) {
    next(err);
  }
});

// POST /surrenders/:id/request - Request a listed surrender ticket (match making)
router.post('/surrenders/:id/request', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Fetch the surrender ticket to verify its existence, status and owner
    const { data: surrender, error: fetchError } = await supabase
      .from('tatkal_surrenders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[SURRENDER] Database error fetching surrender details:', fetchError.message);
      return res.status(500).json({ error: 'Failed to retrieve surrender ticket', code: 'SERVER_ERROR' });
    }

    if (!surrender) {
      return res.status(404).json({
        error: 'Surrender ticket not found',
        code: 'NOT_FOUND'
      });
    }

    if (surrender.status !== 'LISTED') {
      return res.status(400).json({
        error: 'This surrender ticket is no longer available.',
        code: 'TICKET_NOT_AVAILABLE'
      });
    }

    if (surrender.owner_user_id === userId) {
      return res.status(400).json({
        error: 'You cannot request your own surrender ticket.',
        code: 'SELF_REQUEST'
      });
    }

    // Match the ticket: update status, requester_user_id, and matched_at
    const { data: matchedSurrender, error: updateError } = await supabase
      .from('tatkal_surrenders')
      .update({
        status: 'MATCHED',
        requester_user_id: userId,
        matched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'LISTED') // Concurrency guard: only match if still listed
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('[SURRENDER] Database error matching surrender ticket:', updateError.message);
      return res.status(500).json({ error: 'Failed to process surrender request', code: 'SERVER_ERROR' });
    }

    if (!matchedSurrender) {
      return res.status(400).json({
        error: 'This surrender ticket is no longer available.',
        code: 'TICKET_NOT_AVAILABLE'
      });
    }

    return res.status(200).json({
      data: matchedSurrender,
      message: 'Surrender ticket requested and matched successfully.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
