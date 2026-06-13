const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const supabase = require('../db/supabase-client');
const userDb = require('../db/user-db');
const { deriveMaskedInitials } = require('../services/safety-service');
const { sendSOSMessage } = require('../services/twilioService');

const router = express.Router();

/* ============================================================
 * ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
 * ============================================================
 * // In-memory fallback database for dev/mock mode
 * const mockDb = {
 *   safety_events: [],
 *   trusted_contacts: []
 * };
 *
 * // Helper for database error fallbacks under mock/dev mode
 * function checkMockFallback(req, err) {
 *   const userId = req.user?.user_id;
 *   const isDevToken = userId === 'afa5b750-76ce-49b4-9152-268206e80f0c' || userId === '1bfc2d7c-2090-4776-8683-470b363d77b1' || userId === 'c0a80101-76ce-49b4-9152-268206e80f0d' || userId === '65c72d32-1610-4c4b-ac4c-3aa4204d6846';
 *   return isDevToken || !process.env.SUPABASE_JWT_SECRET || (err && err.code === '42501');
 * }
 * ============================================================ */

// Helper to format validation errors
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map((err) => ({ field: err.param || err.path, message: err.msg }))
    });
  }
  next();
}

/**
 * POST /api/safety/sos
 */
router.post('/sos', verifyToken, [
  body('lat').optional().isNumeric(),
  body('lng').optional().isNumeric()
], handleValidation, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { lat, lng, alert_subtype, train_number, coach, berth, station_code, description } = req.body;

    let user = null;
    try { user = await userDb.getUserById(userId); } catch (e) { console.warn('[SOS] getUserById failed:', e.message); }
    const name = user ? user.name : 'Demo Passenger';
    const maskedInitials = deriveMaskedInitials(name);

    // Always write to real database — demo user IDs are seeded in the users table
    const { data: event, error } = await supabase.from('safety_events').insert({
      user_id: userId, event_type: 'SOS', priority: 'CRITICAL', status: 'ACTIVE',
      lat: lat || 28.6419, lng: lng || 77.2194, alert_subtype: alert_subtype || 'OTHER',
      train_number: train_number || null, coach: coach || null, berth: berth || null,
      station_code: station_code || null, description, masked_initials: maskedInitials
    }).select('*').single();

    if (error) {
      console.error('[SOS] Database insert error:', error.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (checkMockFallback(req, error)) {
       *   event = {
       *     id: 'mock-sos-' + Date.now(), user_id: userId, event_type: 'SOS', priority: 'CRITICAL', status: 'ACTIVE',
       *     lat: lat || 28.6419, lng: lng || 77.2194, alert_subtype: alert_subtype || 'PERSONAL_SAFETY',
       *     train_number: train_number || '12951', coach: coach || 'B4', berth: berth || '32', station_code: station_code || 'NDLS',
       *     description, masked_initials: maskedInitials, sms_sent: false, sms_contacts_count: 0, created_at: new Date().toISOString()
       *   };
       *   mockDb.safety_events.push(event);
       * } else { throw error; }
       */
      return res.status(500).json({ error: 'Failed to create SOS alert', code: 'SERVER_ERROR', details: error.message });
    }

    res.status(201).json({ data: event, message: 'SOS alert sent. Help is on the way.' });

    // Background SMS
    setImmediate(async () => {
      try {
        let contacts = [];
        const { data: contactRows, error: contactErr } = await supabase.from('trusted_contacts').select('phone').eq('user_id', userId);
        if (contactRows && contactRows.length > 0) {
          contacts = contactRows.map(c => c.phone);
        }
        /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
         * if (contacts.length === 0 && checkMockFallback(req, contactErr)) {
         *   contacts = mockDb.trusted_contacts.filter(c => c.user_id === userId).map(c => c.phone);
         * }
         */
        if (contacts.length === 0 && user && user.emergency_contacts) {
          contacts = user.emergency_contacts;
        }

        if (contacts.length > 0) {
          const successCount = await sendSOSMessage(contacts, { lat: event.lat, lng: event.lng }, maskedInitials, 'SOS');
          const updates = { sms_sent: successCount > 0, sms_contacts_count: successCount };
          const { error: updateErr } = await supabase.from('safety_events').update(updates).eq('id', event.id);
          if (updateErr) {
            console.error('[SOS Async] Failed to update sms status:', updateErr.message);
          }
        }
      } catch (e) { console.error('[SOS Async] Error:', e.message); }
    });
  } catch (error) { next(error); }
});

/**
 * POST /api/safety/compartment
 */
router.post('/compartment', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { train_number, coach, alert_subtype, lat, lng, station_code, description } = req.body;
    let user = null;
    try { user = await userDb.getUserById(userId); } catch (e) { console.warn('[COMPARTMENT] getUserById failed:', e.message); }
    const maskedInitials = deriveMaskedInitials(user ? user.name : '');

    // Always write to real database
    const { data: event, error } = await supabase.from('safety_events').insert({
      user_id: userId, event_type: 'COMPARTMENT_VIOLATION', priority: 'HIGH', status: 'ACTIVE',
      train_number, coach, alert_subtype: alert_subtype || 'HARASSMENT', lat, lng, station_code, description, masked_initials: maskedInitials
    }).select('*').single();

    if (error) {
      console.error('[COMPARTMENT] Database insert error:', error.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (checkMockFallback(req, error)) {
       *   event = {
       *     id: 'mock-comp-' + Date.now(), user_id: userId, event_type: 'COMPARTMENT_VIOLATION', priority: 'HIGH', status: 'ACTIVE',
       *     train_number, coach, alert_subtype: alert_subtype || 'HARASSMENT', lat, lng, station_code, description, masked_initials: maskedInitials, created_at: new Date().toISOString()
       *   };
       *   mockDb.safety_events.push(event);
       * } else { throw error; }
       */
      return res.status(500).json({ error: 'Failed to submit compartment alert', code: 'SERVER_ERROR', details: error.message });
    }
    return res.status(201).json({ data: event, message: 'Compartment alert submitted successfully.' });
  } catch (error) { next(error); }
});

/**
 * POST /api/safety/hazard
 */
router.post('/hazard', verifyToken, [
  body('alert_subtype').isString(),
  body('lat').isNumeric(),
  body('lng').isNumeric()
], handleValidation, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { alert_subtype, lat, lng, description, photo_url, media_url, station_code } = req.body;
    let user = null;
    try { user = await userDb.getUserById(userId); } catch (e) { console.warn('[HAZARD] getUserById failed:', e.message); }
    const maskedInitials = deriveMaskedInitials(user ? user.name : '');

    // Always write to real database
    const { data: event, error } = await supabase.from('safety_events').insert({
      user_id: userId, event_type: 'HAZARD_REPORT', priority: 'MEDIUM', status: 'ACTIVE',
      alert_subtype, lat, lng, description, media_url: photo_url || media_url, station_code, masked_initials: maskedInitials
    }).select('*').single();

    if (error) {
      console.error('[HAZARD] Database insert error:', error.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (checkMockFallback(req, error)) {
       *   event = {
       *     id: 'mock-haz-' + Date.now(), user_id: userId, event_type: 'HAZARD_REPORT', priority: 'MEDIUM', status: 'ACTIVE',
       *     alert_subtype, lat, lng, description, media_url: photo_url || media_url, station_code, masked_initials: maskedInitials, created_at: new Date().toISOString()
       *   };
       *   mockDb.safety_events.push(event);
       * } else { throw error; }
       */
      return res.status(500).json({ error: 'Failed to submit hazard report', code: 'SERVER_ERROR', details: error.message });
    }
    return res.status(201).json({ data: event, message: 'Hazard report submitted successfully.' });
  } catch (error) { next(error); }
});

/**
 * GET /api/safety/my-events
 */
router.get('/my-events', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { data: events, error } = await supabase.from('safety_events').select('*').eq('user_id', userId).order('created_at', { ascending: false });

    if (error) {
      console.error('DB error /my-events:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve events', code: 'SERVER_ERROR' });
    }

    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * if (events.length === 0 && checkMockFallback(req)) {
     *   events = mockDb.safety_events.filter(e => e.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
     * }
     */
    return res.status(200).json({ data: events || [], message: 'ok' });
  } catch (error) { next(error); }
});

/**
 * PATCH /api/safety/sos/:id/audio
 */
router.patch('/sos/:id/audio', verifyToken, [
  body('audio_url').isURL()
], handleValidation, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { audio_url } = req.body;

    const { data: event, error } = await supabase.from('safety_events').update({ media_url: audio_url }).eq('id', req.params.id).eq('user_id', userId).select('*').single();

    if (error) {
      console.error('[AUDIO PATCH] Database error:', error.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (checkMockFallback(req, error)) {
       *   const found = mockDb.safety_events.find(e => e.id === req.params.id && e.user_id === userId);
       *   if (found) { found.media_url = audio_url; event = found; }
       *   else { event = { id: req.params.id, user_id: userId, media_url: audio_url }; }
       * } else { throw error; }
       */
      return res.status(500).json({ error: 'Failed to update audio', code: 'SERVER_ERROR' });
    }
    return res.status(200).json({ data: event, message: 'ok' });
  } catch (error) { next(error); }
});

/**
 * GET /api/safety/rpf/live
 */
router.get('/rpf/live', async (req, res, next) => {
  try {
    const { data: events, error } = await supabase.from('safety_events').select('*').in('status', ['ACTIVE', 'ACKNOWLEDGED']).order('created_at', { ascending: false }).limit(50);

    if (error) {
      console.error('DB error /rpf/live:', error.message);
      return res.status(500).json({ error: 'Failed to load live events', code: 'SERVER_ERROR' });
    }

    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * if (events.length === 0) {
     *   events = mockDb.safety_events.filter(e => ['ACTIVE', 'ACKNOWLEDGED'].includes(e.status)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
     * }
     */
    return res.status(200).json({ data: events || [], message: 'ok' });
  } catch (error) { next(error); }
});

/**
 * PATCH /api/safety/events/:id/resolve
 */
router.patch('/events/:id/resolve', [
  // TODO: Add RPF admin auth middleware in production.
  // For MVP demo, this endpoint is intentionally unprotected (matches /rpf/live pattern).
  // In production: require RPF officer JWT with role check.
  body('status')
    .isIn(['ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'])
    .withMessage('status must be one of ACKNOWLEDGED, RESOLVED, FALSE_ALARM'),
  body('rpf_note').optional().isString()
], handleValidation, async (req, res, next) => {
  try {
    const { status, rpf_note } = req.body;
    const updates = { status, rpf_note, updated_at: new Date().toISOString() };
    if (status === 'RESOLVED') updates.resolved_at = new Date().toISOString();

    const { data: event, error } = await supabase.from('safety_events').update(updates).eq('id', req.params.id).select('*').single();

    if (error) {
      console.error('[RESOLVE] Database error:', error.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (checkMockFallback(req, error)) {
       *   const found = mockDb.safety_events.find(e => e.id === req.params.id);
       *   if (found) { Object.assign(found, updates); event = found; }
       *   else { event = { id: req.params.id, ...updates }; }
       * } else { throw error; }
       */
      return res.status(500).json({ error: 'Failed to resolve event', code: 'SERVER_ERROR' });
    }
    return res.status(200).json({ data: event, message: 'ok' });
  } catch (error) { next(error); }
});

/**
 * GET /api/safety/public/map
 */
router.get('/public/map', async (req, res, next) => {
  try {
    let query = supabase.from('safety_events').select('id, event_type, alert_subtype, lat, lng, status, train_number, created_at');
    if (req.query.type) query = query.eq('event_type', req.query.type);
    if (req.query.status) query = query.eq('status', req.query.status);

    const { data: events, error } = await query;

    if (error) {
      console.error('DB error /public/map:', error.message);
      return res.status(500).json({ error: 'Failed to load map data', code: 'SERVER_ERROR' });
    }

    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * if (events.length === 0) {
     *   let list = mockDb.safety_events.map(({ id, event_type, alert_subtype, lat, lng, status, train_number, created_at }) => ({
     *     id, event_type, alert_subtype, lat, lng, status, train_number, created_at
     *   }));
     *   if (req.query.type) list = list.filter(e => e.event_type === req.query.type);
     *   if (req.query.status) list = list.filter(e => e.status === req.query.status);
     *   events = list;
     * }
     */
    return res.status(200).json({ data: events || [], message: 'ok' });
  } catch (error) { next(error); }
});

/**
 * GET /api/safety/contacts
 */
router.get('/contacts', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { data: contacts, error } = await supabase.from('trusted_contacts').select('*').eq('user_id', userId).order('created_at', { ascending: true });

    if (error) {
      console.error('DB error /contacts:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve contacts', code: 'SERVER_ERROR' });
    }

    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * if (contacts.length === 0 && checkMockFallback(req)) {
     *   contacts = mockDb.trusted_contacts.filter(c => c.user_id === userId);
     * }
     */
    return res.status(200).json({ data: contacts || [], message: 'ok' });
  } catch (error) { next(error); }
});

/**
 * POST /api/safety/contacts
 */
router.post('/contacts', verifyToken, [
  body('name').isString().isLength({ min: 2, max: 100 }),
  body('phone').isString().isLength({ min: 10, max: 15 })
], handleValidation, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { name, phone } = req.body;

    const { data: contact, error } = await supabase.from('trusted_contacts').insert({ user_id: userId, name, phone }).select('*').single();

    if (error) {
      console.error('[CONTACTS POST] Database insert error:', error.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (checkMockFallback(req, error)) {
       *   contact = { id: 'mock-contact-' + Date.now(), user_id: userId, name, phone, created_at: new Date().toISOString() };
       *   mockDb.trusted_contacts.push(contact);
       * } else { throw error; }
       */
      return res.status(500).json({ error: 'Failed to add contact', code: 'SERVER_ERROR' });
    }
    return res.status(201).json({ data: contact, message: 'ok' });
  } catch (error) { next(error); }
});

/**
 * DELETE /api/safety/contacts/:id
 */
router.delete('/contacts/:id', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const { data: deletedContact, error } = await supabase.from('trusted_contacts').delete().eq('id', req.params.id).eq('user_id', userId).select('*').single();

    if (error) {
      console.error('[CONTACTS DELETE] Database error:', error.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (checkMockFallback(req, error)) {
       *   const idx = mockDb.trusted_contacts.findIndex(c => c.id === req.params.id && c.user_id === userId);
       *   if (idx !== -1) { deletedContact = mockDb.trusted_contacts.splice(idx, 1)[0]; }
       *   else { deletedContact = { id: req.params.id, user_id: userId }; }
       * } else { throw error; }
       */
      return res.status(500).json({ error: 'Failed to delete contact', code: 'SERVER_ERROR' });
    }
    return res.status(200).json({ data: deletedContact, message: 'ok' });
  } catch (error) { next(error); }
});

module.exports = router;
