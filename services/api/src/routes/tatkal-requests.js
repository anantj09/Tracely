// services/api/src/routes/tatkal-requests.js
// Sub-router for request-related endpoints under /api/tatkal
// Path: services/api/src/routes/tatkal-requests.js

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const supabase = require('../db/supabase-client');

// GET /my-requests - Get all Tatkal requests for the authenticated user
router.get('/my-requests', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const { data: requests, error } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TATKAL] Database error fetching my requests:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve Tatkal requests', code: 'SERVER_ERROR' });
    }

    return res.status(200).json({
      data: requests || [],
      message: 'ok'
    });
  } catch (err) {
    next(err);
  }
});

// GET /my-locks - Get all active journey locks with parent booking details for the authenticated user
router.get('/my-locks', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const { data: locks, error } = await supabase
      .from('active_passenger_locks')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[LOCKS] Database error fetching active passenger locks:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve passenger locks', code: 'SERVER_ERROR' });
    }

    return res.status(200).json({
      data: locks || [],
      message: 'ok'
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Get a specific Tatkal request by ID (must own it)
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      return next();
    }

    const { data: request, error } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[TATKAL] Database error fetching request:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve request details', code: 'SERVER_ERROR' });
    }

    if (!request) {
      return res.status(404).json({
        error: 'Tatkal request not found',
        code: 'NOT_FOUND'
      });
    }

    if (request.user_id !== userId) {
      return res.status(403).json({
        error: 'You are not authorized to view this request',
        code: 'FORBIDDEN'
      });
    }

    return res.status(200).json({
      data: request,
      message: 'ok'
    });
  } catch (err) {
    next(err);
  }
});

// POST /cancel/:id - Cancel a pending Tatkal request
router.post('/cancel/:id', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid ID format. Must be a valid UUID.', code: 'INVALID_ID_FORMAT' });
    }

    // Fetch the request first to verify ownership and check its status
    const { data: request, error: fetchError } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[TATKAL] Database error fetching request for cancellation:', fetchError.message);
      return res.status(500).json({ error: 'Failed to retrieve request details', code: 'SERVER_ERROR' });
    }

    if (!request) {
      return res.status(404).json({
        error: 'Tatkal request not found',
        code: 'NOT_FOUND'
      });
    }

    if (request.user_id !== userId) {
      return res.status(403).json({
        error: 'You are not authorized to cancel this request',
        code: 'FORBIDDEN'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Only pending requests can be cancelled.',
        code: 'INVALID_STATUS'
      });
    }

    // Update request status to CANCELLED
    const { data: updatedRequest, error: updateError } = await supabase
      .from('tatkal_requests')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[TATKAL] Database error updating request status to CANCELLED:', updateError.message);
      return res.status(500).json({ error: 'Failed to cancel request', code: 'SERVER_ERROR' });
    }

    return res.status(200).json({
      data: updatedRequest,
      message: 'Request cancelled successfully.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
