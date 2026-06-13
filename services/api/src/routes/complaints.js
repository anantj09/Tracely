// services/api/src/routes/complaints.js

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const supabase = require('../db/supabase-client');
const { verifyToken } = require('../middleware/auth');
const { 
  generateReferenceNumber, 
  calculatePriorityAndStatus, 
  isValidComplaintType,
  isReopenAllowed,
  validateStatusTransition
} = require('../services/complaint-service');
const { sendPushNotification } = require('../services/notificationService');

/* ============================================================
 * ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
 * ============================================================
 * // Global in-memory complaints store to persist submissions in mock-mode
 * const inMemoryComplaints = [ ... ]; // (removed for brevity — demo users now use real DB)
 * ============================================================ */
// Empty stub so references don't crash (handlers still reference it in commented-out blocks)
const inMemoryComplaints = [];


/*
-- ============================================================
-- Run this in Supabase SQL Editor to create the heatmap RPC function:
-- ============================================================
CREATE OR REPLACE FUNCTION get_heatmap_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(station_data) INTO result
  FROM (
    SELECT
      sc.station_code,
      sc.station_name,
      sc.lat,
      sc.lng,
      COUNT(c.id) AS total_complaints,
      json_object_agg(
        COALESCE(c.complaint_type, 'OTHER'),
        type_counts.cnt
      ) FILTER (WHERE c.complaint_type IS NOT NULL) AS by_type,
      (
        SELECT json_agg(daily_count ORDER BY day ASC)
        FROM (
          SELECT
            d::date AS day,
            COALESCE(COUNT(c2.id), 0) AS daily_count
          FROM generate_series(
            (CURRENT_DATE - INTERVAL '29 days')::date,
            CURRENT_DATE::date,
            INTERVAL '1 day'
          ) AS gs(d)
          LEFT JOIN complaints c2
            ON c2.station_code = sc.station_code
            AND DATE(c2.created_at) = d::date
          GROUP BY d
        ) daily
      ) AS last_30_days
    FROM station_coordinates sc
    JOIN complaints c ON c.station_code = sc.station_code
    JOIN (
      SELECT station_code, complaint_type, COUNT(*) AS cnt
      FROM complaints
      GROUP BY station_code, complaint_type
    ) type_counts ON type_counts.station_code = c.station_code
      AND type_counts.complaint_type = c.complaint_type
    GROUP BY sc.station_code, sc.station_name, sc.lat, sc.lng
  ) station_data;
  RETURN result;
END;
$$;
*/

// GET /public/heatmap - Public heat map endpoint (aggregates complaints by station)
const heatmapHandler = async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_heatmap_data');

    if (!rpcError && rpcData) {
      return res.status(200).json({ data: rpcData || [], message: 'ok' });
    }

    // Fallback: JavaScript-side aggregation
    console.warn('[HEATMAP] RPC failed, using JS fallback:', rpcError?.message);

    const { data: complaints, error: complaintsError } = await supabase
      .from('complaints')
      .select('station_code, complaint_type, created_at');

    if (complaintsError) throw complaintsError;

    const { data: stations, error: stationsError } = await supabase
      .from('station_coordinates')
      .select('station_code, station_name, lat, lng');

    if (stationsError) throw stationsError;

    // Aggregate by station
    const stationMap = {};
    for (const station of stations) {
      stationMap[station.station_code] = {
        station_code: station.station_code,
        station_name: station.station_name,
        lat: Number(station.lat),
        lng: Number(station.lng),
        total_complaints: 0,
        by_type: {},
        last_30_days: Array(30).fill(0),
      };
    }

    const now = new Date();
    for (const complaint of complaints) {
      const s = stationMap[complaint.station_code];
      if (!s) continue;
      s.total_complaints += 1;
      s.by_type[complaint.complaint_type] = (s.by_type[complaint.complaint_type] || 0) + 1;

      // Compute day index (0 = 29 days ago, 29 = today)
      const daysDiff = Math.floor((now - new Date(complaint.created_at)) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 30) {
        s.last_30_days[29 - daysDiff] += 1;
      }
    }

    const result = Object.values(stationMap).filter(s => s.total_complaints > 0);
    return res.status(200).json({ data: result, message: 'ok' });

  } catch (error) {
    console.error('[HEATMAP] Error:', error.message);
    if (error.code === '42501' || !process.env.SUPABASE_JWT_SECRET || error.message.includes('permission denied')) {
      console.warn('Returning mock heatmap data due to DB permission error or missing JWT secret');
      
      const defaultStations = [
        { station_code: 'NDLS', station_name: 'New Delhi', lat: 28.6415, lng: 77.2193 },
        { station_code: 'MMCT', station_name: 'Mumbai Central', lat: 18.9696, lng: 72.8193 },
        { station_code: 'HWH', station_name: 'Howrah Junction', lat: 22.5834, lng: 88.3426 },
        { station_code: 'MTJ', station_name: 'Mathura Junction', lat: 27.4924, lng: 77.6737 }
      ];
      
      const stationMap = {};
      for (const st of defaultStations) {
        stationMap[st.station_code] = {
          station_code: st.station_code,
          station_name: st.station_name,
          lat: st.lat,
          lng: st.lng,
          total_complaints: 0,
          by_type: {},
          last_30_days: Array(30).fill(0)
        };
      }
      
      // Populate defaults
      stationMap['NDLS'].total_complaints = 15;
      stationMap['NDLS'].by_type = { CLEANLINESS: 6, FOOD: 4, SAFETY: 5 };
      stationMap['NDLS'].last_30_days = Array(30).fill(0).map(() => Math.floor(Math.random() * 3));
      
      stationMap['MMCT'].total_complaints = 12;
      stationMap['MMCT'].by_type = { CLEANLINESS: 4, AC_HEATING: 5, FOOD: 3 };
      stationMap['MMCT'].last_30_days = Array(30).fill(0).map(() => Math.floor(Math.random() * 2));
      
      stationMap['HWH'].total_complaints = 8;
      stationMap['HWH'].by_type = { CLEANLINESS: 3, STAFF: 3, OTHER: 2 };
      stationMap['HWH'].last_30_days = Array(30).fill(0).map(() => Math.floor(Math.random() * 2));
      
      // Aggregate in-memory complaints
      const now = new Date();
      for (const c of inMemoryComplaints) {
        if (!c.station_code || c.station_code === 'UNKNOWN') continue;
        
        let s = stationMap[c.station_code];
        if (!s) {
          s = {
            station_code: c.station_code,
            station_name: c.station_name || c.station_code,
            lat: 28.6415 + (Math.random() - 0.5) * 5,
            lng: 77.2193 + (Math.random() - 0.5) * 5,
            total_complaints: 0,
            by_type: {},
            last_30_days: Array(30).fill(0)
          };
          stationMap[c.station_code] = s;
        }
        
        s.total_complaints += 1;
        s.by_type[c.complaint_type] = (s.by_type[c.complaint_type] || 0) + 1;
        
        const daysDiff = Math.floor((now - new Date(c.created_at)) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff < 30) {
          s.last_30_days[29 - daysDiff] += 1;
        }
      }
      
      const result = Object.values(stationMap).filter(s => s.total_complaints > 0);
      return res.status(200).json({ data: result, message: 'ok (mocked)' });
    }
    return res.status(500).json({ error: 'Failed to load heatmap data', code: 'SERVER_ERROR' });
  }
};

// GET /public/stats - Overall platform statistics
const statsHandler = async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');

    const todayStr = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Run all queries in parallel
    const [todayResult, monthResult, resolvedResult, typeResult, stationResult] = await Promise.all([
      supabase.from('complaints').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).gte('created_at', monthStartStr),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'RESOLVED'),
      supabase.from('complaints').select('complaint_type').then(({ data }) => {
        if (!data) return null;
        const counts = {};
        data.forEach(r => { counts[r.complaint_type] = (counts[r.complaint_type] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'CLEANLINESS';
      }),
      supabase.from('complaints').select('station_code').then(({ data }) => {
        if (!data) return null;
        const counts = {};
        data.forEach(r => { counts[r.station_code] = (counts[r.station_code] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NDLS';
      }),
    ]);

    const totalComplaints = monthResult.count || 0;
    const resolvedCount = resolvedResult.count || 0;
    const resolutionRate = totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 0;

    return res.status(200).json({
      data: {
        total_complaints_today: todayResult.count || 0,
        total_complaints_this_month: totalComplaints,
        resolution_rate_percent: resolutionRate,
        most_common_type: typeResult || 'CLEANLINESS',
        most_complained_station: stationResult || 'NDLS',
      },
      message: 'ok',
    });
  } catch (error) {
    console.error('[STATS] Error:', error.message);
    if (error.code === '42501' || !process.env.SUPABASE_JWT_SECRET || error.message.includes('permission denied')) {
      console.warn('Returning mock stats due to DB permission error or missing JWT secret');
      return res.status(200).json({
        data: {
          total_complaints_today: 4,
          total_complaints_this_month: 28,
          resolution_rate_percent: 78,
          most_common_type: 'CLEANLINESS',
          most_complained_station: 'NDLS',
        },
        message: 'ok (mocked)',
      });
    }
    return res.status(500).json({ error: 'Failed to load stats', code: 'SERVER_ERROR' });
  }
};

// Express Validation Rules for Complaint Filing
const complaintValidation = [
  body('complaint_type')
    .notEmpty().withMessage('complaint_type is required')
    .custom(isValidComplaintType).withMessage('Invalid complaint_type. Must be one of: CLEANLINESS, AC_HEATING, STAFF, FOOD, SAFETY, OVERCROWDING, AMENITY, OTHER'),
  body('description')
    .isString().isLength({ min: 10, max: 500 }).withMessage('description must be 10–500 characters'),
  body('station_code')
    .isString().isLength({ min: 2, max: 7 }).withMessage('station_code must be 2–7 characters').trim().toUpperCase(),
  body('travel_date')
    .optional().isISO8601().withMessage('travel_date must be a valid date (YYYY-MM-DD)'),
  body('photo_url')
    .optional().isURL().withMessage('photo_url must be a valid URL'),
  body('pnr_number')
    .optional().isString().isLength({ min: 10, max: 10 }).isNumeric().withMessage('pnr_number must be exactly 10 digits if provided'),
];

// Express Validation Rules for Admin Status Update
const statusUpdateValidation = [
  body('new_status')
    .notEmpty().withMessage('new_status is required')
    .isIn(['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
    .withMessage('new_status must be one of: ACKNOWLEDGED, IN_PROGRESS, RESOLVED, REJECTED'),
  body('note')
    .optional()
    .isString().withMessage('note must be a string')
    .isLength({ max: 500 }).withMessage('note cannot exceed 500 characters'),
];

// Express Validation Rules for User Reopen
const reopenValidation = [
  body('description')
    .isString().withMessage('description must be a string')
    .isLength({ min: 20, max: 500 }).withMessage('Reopen description must be 20–500 characters'),
];

// GET / - List complaints for logged-in user
const listHandler = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Optional status validation if provided
    const validStatuses = ['SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
    if (req.query.status && !validStatuses.includes(req.query.status)) {
      return res.status(400).json({ error: 'Invalid status parameter', code: 'VALIDATION_ERROR' });
    }

    // Optional type validation if provided
    if (req.query.type && !isValidComplaintType(req.query.type)) {
      return res.status(400).json({ error: 'Invalid type parameter', code: 'VALIDATION_ERROR' });
    }

    let query = supabase
      .from('complaints')
      .select('id, reference_number, complaint_type, status, priority, train_number, train_name, coach, berth, station_code, station_name, travel_date, is_reopened, reopen_count, photo_url, created_at, updated_at')
      .eq('user_id', userId);

    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    if (req.query.type) {
      query = query.eq('complaint_type', req.query.type);
    }

    query = query.order('created_at', { ascending: false });

    const { data: complaints, error: listError } = await query;

    if (listError) {
      console.error('List complaints error:', listError);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (listError.code === '42501' || !process.env.SUPABASE_JWT_SECRET || listError.message.includes('permission denied')) {
       *   let list = [...inMemoryComplaints].filter(c => c.user_id === userId);
       *   return res.status(200).json({ data: list, message: 'ok (mocked)' });
       * }
       */
      return res.status(500).json({ error: 'Failed to retrieve complaints', code: 'SERVER_ERROR' });
    }

    let mergedComplaints = complaints || [];
    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * // If running in dev/mock mode, merge inMemoryComplaints
     * if (!process.env.SUPABASE_JWT_SECRET || userId === 'afa5b750-76ce-49b4-9152-268206e80f0c') {
     *   // ... merge logic ...
     * }
     */

    return res.status(200).json({
      data: mergedComplaints,
      message: 'ok'
    });
  } catch (error) {
    console.error('List complaints catch error:', error.message);
    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * if (error.code === '42501' || !process.env.SUPABASE_JWT_SECRET) {
     *   return res.status(200).json({ data: [...inMemoryComplaints], message: 'ok (mocked)' });
     * }
     */
    next(error);
  }
};

// GET /:id - Get details of one complaint with chronological timeline
const detailHandler = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const complaintId = req.params.id;

    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * const memoryComplaint = inMemoryComplaints.find(c => c.id === complaintId);
     * if (memoryComplaint) {
     *   return res.status(200).json({ data: memoryComplaint, message: 'ok (mocked)' });
     * }
     */


    // Fetch complaint
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch complaint details error:', fetchError);
      if (fetchError.code === '42501' || !process.env.SUPABASE_JWT_SECRET || fetchError.message.includes('permission denied')) {
        const mockDetail = {
          id: complaintId,
          user_id: userId,
          reference_number: 'RS-20260611-00001',
          complaint_type: 'CLEANLINESS',
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          train_number: '12951',
          train_name: 'Mumbai Rajdhani',
          coach: 'B4',
          berth: '12',
          station_code: 'NDLS',
          station_name: 'New Delhi',
          travel_date: new Date().toISOString().split('T')[0],
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          timeline: [
            {
              id: 't1',
              complaint_id: complaintId,
              from_status: null,
              to_status: 'SUBMITTED',
              changed_by: 'USER',
              note: 'Complaint filed by passenger.',
              created_at: new Date(Date.now() - 2 * 3600000).toISOString()
            }
          ]
        };
        return res.status(200).json({ data: mockDetail, message: 'ok (mocked)' });
      }
      return res.status(500).json({ error: 'Failed to retrieve complaint details', code: 'SERVER_ERROR' });
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found', code: 'NOT_FOUND' });
    }

    // Check authorization
    if (complaint.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this complaint', code: 'FORBIDDEN' });
    }

    // Fetch timeline entries ordered by oldest first
    const { data: timeline, error: timelineError } = await supabase
      .from('complaint_timeline')
      .select('*')
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: true });

    if (timelineError) {
      console.error('Fetch timeline error:', timelineError);
      if (timelineError.code === '42501' || !process.env.SUPABASE_JWT_SECRET || timelineError.message.includes('permission denied')) {
        const mockDetail = {
          id: complaintId,
          user_id: userId,
          reference_number: 'RS-20260611-00001',
          complaint_type: 'CLEANLINESS',
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          train_number: '12951',
          train_name: 'Mumbai Rajdhani',
          coach: 'B4',
          berth: '12',
          station_code: 'NDLS',
          station_name: 'New Delhi',
          travel_date: new Date().toISOString().split('T')[0],
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          timeline: [
            {
              id: 't1',
              complaint_id: complaintId,
              from_status: null,
              to_status: 'SUBMITTED',
              changed_by: 'USER',
              note: 'Complaint filed by passenger.',
              created_at: new Date(Date.now() - 2 * 3600000).toISOString()
            }
          ]
        };
        return res.status(200).json({ data: mockDetail, message: 'ok (mocked)' });
      }
      return res.status(500).json({ error: 'Failed to retrieve complaint timeline', code: 'SERVER_ERROR' });
    }

    return res.status(200).json({
      data: { ...complaint, timeline: timeline || [] },
      message: 'ok'
    });
  } catch (error) {
    console.error('Detail handler catch error:', error.message);
    if (error.code === '42501' || !process.env.SUPABASE_JWT_SECRET || error.message.includes('permission denied')) {
      const mockDetail = {
        id: complaintId,
        user_id: userId,
        reference_number: 'RS-20260611-00001',
        complaint_type: 'CLEANLINESS',
        status: 'IN_PROGRESS',
        priority: 'NORMAL',
        train_number: '12951',
        train_name: 'Mumbai Rajdhani',
        coach: 'B4',
        berth: '12',
        station_code: 'NDLS',
        station_name: 'New Delhi',
        travel_date: new Date().toISOString().split('T')[0],
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        timeline: [
          {
            id: 't1',
            complaint_id: complaintId,
            from_status: null,
            to_status: 'SUBMITTED',
            changed_by: 'USER',
            note: 'Complaint filed by passenger.',
            created_at: new Date(Date.now() - 2 * 3600000).toISOString()
          }
        ]
      };
      return res.status(200).json({ data: mockDetail, message: 'ok (mocked)' });
    }
    next(error);
  }
};

// POST / - File a new complaint
const postHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR', 
        details: errors.array() 
      });
    }

    const userId = req.user.user_id;

    let referenceNumber, exists;
    do {
      referenceNumber = generateReferenceNumber();
      const { data: existing, error: checkError } = await supabase
        .from('complaints')
        .select('id')
        .eq('reference_number', referenceNumber)
        .maybeSingle();

      if (checkError) throw checkError;
      exists = !!existing;
    } while (exists);

    const { data: station, error: stationError } = await supabase
      .from('station_coordinates')
      .select('lat, lng, station_name')
      .eq('station_code', req.body.station_code)
      .maybeSingle();

    if (stationError) {
      console.warn('Non-blocking: Failed to retrieve station coordinates:', stationError.message);
    }

    const stationLat = station?.lat || null;
    const stationLng = station?.lng || null;
    const resolvedStationName = station?.station_name || req.body.station_name || null;

    const { status: calculatedStatus, priority: calculatedPriority } = calculatePriorityAndStatus(req.body.complaint_type);

    const complaintRecord = {
      user_id: userId,
      reference_number: referenceNumber,
      complaint_type: req.body.complaint_type,
      description: req.body.description,
      photo_url: req.body.photo_url || null,
      pnr_number: req.body.pnr_number || null,
      train_number: req.body.train_number || null,
      train_name: req.body.train_name || null,
      coach: req.body.coach || null,
      berth: req.body.berth || null,
      station_code: req.body.station_code,
      station_name: resolvedStationName,
      travel_date: req.body.travel_date || null,
      station_lat: stationLat,
      station_lng: stationLng,
      status: calculatedStatus,
      priority: calculatedPriority,
      expo_push_token: req.body.expo_push_token || null,
    };

    const { data: complaint, error: insertError } = await supabase
      .from('complaints')
      .insert(complaintRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Insert complaint error:', insertError);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (insertError.code === '42501' || !process.env.SUPABASE_JWT_SECRET || insertError.message.includes('permission denied')) {
       *   const mockInserted = { ...complaintRecord, id: 'mock-uuid-' + Date.now(), ... };
       *   inMemoryComplaints.unshift(mockInserted);
       *   return res.status(201).json({ data: mockInserted, message: '...(mocked)' });
       * }
       */
      return res.status(500).json({ error: 'Failed to file complaint', code: 'SERVER_ERROR', details: insertError.message });
    }

    const timelineEntries = [
      {
        complaint_id: complaint.id,
        from_status: null,
        to_status: 'SUBMITTED',
        changed_by: 'USER',
        note: 'Complaint filed by passenger.'
      }
    ];

    if (req.body.complaint_type === 'SAFETY') {
      timelineEntries.push({
        complaint_id: complaint.id,
        from_status: 'SUBMITTED',
        to_status: 'IN_PROGRESS',
        changed_by: 'SYSTEM',
        note: 'Auto-escalated: Safety complaint — priority handling activated.'
      });
      console.log(`[SAFETY_ESCALATION] complaint_id=${complaint.id} at=${new Date().toISOString()}`);
    }

    const { error: timelineError } = await supabase
      .from('complaint_timeline')
      .insert(timelineEntries);

    if (timelineError) {
      console.error('Insert timeline error:', timelineError);
      return res.status(500).json({ error: 'Failed to file complaint', code: 'SERVER_ERROR' });
    }

    sendPushNotification(
      req.body.expo_push_token,
      'Complaint Received',
      `Your complaint ${referenceNumber} has been received. We'll keep you updated.`
    ).catch((err) => {
      console.error('Push notification fire-and-forget failed:', err.message);
    });

    const { data: timeline, error: timelineFetchError } = await supabase
      .from('complaint_timeline')
      .select('*')
      .eq('complaint_id', complaint.id)
      .order('created_at', { ascending: true });

    if (timelineFetchError) {
      console.error('Fetch timeline error:', timelineFetchError);
      return res.status(500).json({ error: 'Failed to retrieve timeline', code: 'SERVER_ERROR' });
    }

    return res.status(201).json({
      data: { ...complaint, timeline },
      message: `Complaint filed. Reference: ${referenceNumber}`
    });

  } catch (error) {
    console.error('Post handler catch error:', error.message);
    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * if (error.code === '42501' || !process.env.SUPABASE_JWT_SECRET || error.message.includes('permission denied')) {
     *   const mockInserted = { ... };
     *   inMemoryComplaints.unshift(mockInserted);
     *   return res.status(201).json({ data: mockInserted, message: '...(mocked)' });
     * }
     */
    next(error);
  }
};

// PATCH /:id/status - Admin status update
const patchHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR', 
        details: errors.array() 
      });
    }

    const complaintId = req.params.id;
    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * const memoryComplaint = inMemoryComplaints.find(c => c.id === complaintId);
     * if (memoryComplaint) { ... mock status update ... }
     */


    // 1. Verify admin role
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', req.user.user_id)
      .maybeSingle();

    if (adminError) {
      console.error('Query admin_users error:', adminError);
      return res.status(500).json({ error: 'Server error verifying admin privileges', code: 'SERVER_ERROR' });
    }

    if (!adminRecord) {
      return res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
    }

    // 2. Fetch complaint
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch complaint for update error:', fetchError);
      return res.status(500).json({ error: 'Failed to retrieve complaint', code: 'SERVER_ERROR' });
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found', code: 'NOT_FOUND' });
    }

    // 3. Validate transition
    const transitionResult = validateStatusTransition(complaint.status, req.body.new_status);
    if (!transitionResult.valid) {
      return res.status(400).json({ error: transitionResult.message, code: 'INVALID_TRANSITION' });
    }

    // 4. Build update data
    const updateData = {
      status: req.body.new_status,
      updated_at: new Date().toISOString()
    };

    if (req.body.new_status === 'RESOLVED') {
      // Set reopen window of 72 hours
      updateData.reopen_deadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    }

    // 5. Update complaints table
    const { data: updatedComplaint, error: updateError } = await supabase
      .from('complaints')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update complaint error:', updateError);
      return res.status(500).json({ error: 'Failed to update complaint status', code: 'SERVER_ERROR' });
    }

    // 6. Insert timeline entry
    const timelineEntry = {
      complaint_id: req.params.id,
      from_status: complaint.status,
      to_status: req.body.new_status,
      changed_by: 'ADMIN',
      note: req.body.note || null
    };

    const { error: timelineError } = await supabase
      .from('complaint_timeline')
      .insert(timelineEntry);

    if (timelineError) {
      console.error('Insert status timeline error:', timelineError);
      return res.status(500).json({ error: 'Failed to record timeline change', code: 'SERVER_ERROR' });
    }

    // 7. Send push notification (non-blocking)
    sendPushNotification(
      complaint.expo_push_token,
      `Update on ${complaint.reference_number}`,
      `Status changed to: ${req.body.new_status}`
    ).catch((err) => {
      console.error('Push notification failed:', err.message);
    });

    // 8. Fetch updated timeline for response
    const { data: timeline, error: timelineFetchError } = await supabase
      .from('complaint_timeline')
      .select('*')
      .eq('complaint_id', req.params.id)
      .order('created_at', { ascending: true });

    if (timelineFetchError) {
      console.error('Fetch updated timeline error:', timelineFetchError);
      return res.status(500).json({ error: 'Failed to retrieve timeline', code: 'SERVER_ERROR' });
    }

    return res.status(200).json({
      data: { ...updatedComplaint, timeline },
      message: 'ok'
    });

  } catch (error) {
    next(error);
  }
};

// POST /:id/reopen - User reopen flow
const reopenHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR', 
        details: errors.array() 
      });
    }

    const complaintId = req.params.id;
    /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
     * const memoryComplaint = inMemoryComplaints.find(c => c.id === complaintId);
     * if (memoryComplaint) { ... mock reopen ... }
     */


    // 1. Fetch complaint
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch complaint for reopen error:', fetchError);
      return res.status(500).json({ error: 'Failed to retrieve complaint', code: 'SERVER_ERROR' });
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found', code: 'NOT_FOUND' });
    }

    // 2. Check ownership
    if (complaint.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Not authorized to reopen this complaint', code: 'FORBIDDEN' });
    }

    // 3. Verify reopen is allowed
    const reopenResult = isReopenAllowed(complaint);
    if (!reopenResult.allowed) {
      return res.status(400).json({ error: reopenResult.reason, code: 'REOPEN_NOT_ALLOWED' });
    }

    // 4. Build update data
    const reopenData = {
      status: 'SUBMITTED',
      is_reopened: true,
      reopen_count: (complaint.reopen_count || 0) + 1,
      priority: 'HIGH',
      updated_at: new Date().toISOString()
    };

    // 5. Update complaints table
    const { data: updatedComplaint, error: updateError } = await supabase
      .from('complaints')
      .update(reopenData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update complaint for reopen error:', updateError);
      return res.status(500).json({ error: 'Failed to reopen complaint', code: 'SERVER_ERROR' });
    }

    // 6. Insert timeline entry
    const timelineEntry = {
      complaint_id: req.params.id,
      from_status: 'RESOLVED',
      to_status: 'SUBMITTED',
      changed_by: 'USER',
      note: req.body.description
    };

    const { error: timelineError } = await supabase
      .from('complaint_timeline')
      .insert(timelineEntry);

    if (timelineError) {
      console.error('Insert timeline for reopen error:', timelineError);
      return res.status(500).json({ error: 'Failed to record timeline change', code: 'SERVER_ERROR' });
    }

    // 7. Send push notification (non-blocking)
    sendPushNotification(
      complaint.expo_push_token,
      'Complaint Reopened',
      `Your complaint ${complaint.reference_number} has been reopened and escalated.`
    ).catch((err) => {
      console.error('Push notification failed:', err.message);
    });

    // 8. Fetch updated timeline for response
    const { data: timeline, error: timelineFetchError } = await supabase
      .from('complaint_timeline')
      .select('*')
      .eq('complaint_id', req.params.id)
      .order('created_at', { ascending: true });

    if (timelineFetchError) {
      console.error('Fetch updated timeline error:', timelineFetchError);
      return res.status(500).json({ error: 'Failed to retrieve timeline', code: 'SERVER_ERROR' });
    }

    return res.status(200).json({
      data: { ...updatedComplaint, timeline },
      message: 'ok'
    });

  } catch (error) {
    next(error);
  }
};

// Helper function to resolve/generate train route stations
function getRouteForTrain(trainNumber, stationCoordsMap) {
  const hardcodedRoutes = {
    '12951': ['MMCT', 'ST', 'BRC', 'RTM', 'SWM', 'MTJ', 'NZM', 'NDLS'],
    '12002': ['NDLS', 'MTJ', 'AGC', 'BPL'],
    '12301': ['HWH', 'DHN', 'GAYA', 'ALD', 'CNB', 'NDLS'],
    '12009': ['MMCT', 'ST', 'BRC', 'ADI'],
    '12259': ['HWH', 'DHN', 'GAYA', 'ALD', 'CNB', 'NDLS'],
    '12627': ['SBC', 'UBL', 'PUNE', 'BRC', 'RTM', 'BPL', 'AGC', 'MTJ', 'NDLS'],
    '12618': ['TVC', 'CBE', 'SBC', 'UBL', 'PUNE', 'BPL', 'AGC', 'MTJ', 'NZM'],
    '12649': ['SBC', 'UBL', 'PUNE', 'BRC', 'RTM', 'SWM', 'MTJ', 'NZM'],
    '12721': ['HYB', 'SC', 'BPL', 'AGC', 'MTJ', 'NZM'],
    '22691': ['SBC', 'SC', 'BPL', 'AGC', 'MTJ', 'NDLS']
  };

  let routeCodes = hardcodedRoutes[trainNumber];
  if (!routeCodes) {
    // Deterministic pseudo-random route generation based on train number
    const seed = parseInt(trainNumber) || 12000;
    const allStationCodes = Object.keys(stationCoordsMap);
    if (allStationCodes.length > 0) {
      const routeSize = 3 + (seed % 3); // 3, 4, or 5 stations
      routeCodes = [];
      for (let i = 0; i < routeSize; i++) {
        const stationIdx = (seed * (i + 1)) % allStationCodes.length;
        const code = allStationCodes[stationIdx];
        if (!routeCodes.includes(code)) {
          routeCodes.push(code);
        }
      }
      // Sort route stations by longitude to make a clean West-to-East route
      routeCodes.sort((a, b) => {
        const lonA = stationCoordsMap[a]?.lng || 0;
        const lonB = stationCoordsMap[b]?.lng || 0;
        return lonA - lonB;
      });
    } else {
      routeCodes = [];
    }
  }

  return routeCodes
    .map(code => {
      const coords = stationCoordsMap[code];
      return {
        code,
        name: coords?.name || code,
        lat: coords ? Number(coords.lat) : 20.5937,
        lng: coords ? Number(coords.lng) : 78.9629
      };
    })
    .filter(st => st.lat && st.lng);
}

// GET /public/train-routes - Get train routes aggregated data for heatmap
const trainRoutesHandler = async (req, res, next) => {
  try {
    const { type, range } = req.query;

    // Fetch station coordinates mapping
    const { data: stations, error: stationsError } = await supabase
      .from('station_coordinates')
      .select('station_code, station_name, lat, lng');

    if (stationsError) throw stationsError;

    const stationCoordsMap = {};
    for (const st of stations) {
      stationCoordsMap[st.station_code] = {
        name: st.station_name,
        lat: Number(st.lat),
        lng: Number(st.lng)
      };
    }

    // Determine date limit
    const limitDate = new Date();
    if (range === 'Last 7 days') {
      limitDate.setDate(limitDate.getDate() - 7);
    } else if (range === 'Last 90 days') {
      limitDate.setDate(limitDate.getDate() - 90);
    } else {
      limitDate.setDate(limitDate.getDate() - 30); // Default to Last 30 days
    }
    const limitDateStr = limitDate.toISOString();

    // Query complaints
    let query = supabase
      .from('complaints')
      .select('*')
      .gte('created_at', limitDateStr);

    if (type && type !== 'All') {
      query = query.eq('complaint_type', type);
    }

    const { data: complaints, error: complaintsError } = await query;
    if (complaintsError) throw complaintsError;

    // Group complaints by train_number
    const trainMap = {};
    for (const c of (complaints || [])) {
      if (!c.train_number) continue;

      const trainNum = c.train_number.toString().trim();
      if (!trainMap[trainNum]) {
        trainMap[trainNum] = {
          train_number: trainNum,
          train_name: c.train_name || `Express Train ${trainNum}`,
          total_complaints: 0,
          breakdown: {},
          coaches: {},
          list: []
        };
      }

      const t = trainMap[trainNum];
      t.total_complaints += 1;

      const cType = c.complaint_type || 'Other';
      t.breakdown[cType] = (t.breakdown[cType] || 0) + 1;

      const coach = c.coach || 'General';
      t.coaches[coach] = (t.coaches[coach] || 0) + 1;

      t.list.push(c);
    }

    // Convert to list, attach routes, sort by complaints count descending
    const trainList = Object.values(trainMap).map(t => {
      t.route = getRouteForTrain(t.train_number, stationCoordsMap);
      t.list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      t.sortedBreakdown = Object.entries(t.breakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      t.topType = t.sortedBreakdown.length > 0 ? t.sortedBreakdown[0][0] : 'Other';

      return t;
    }).filter(t => t.route && t.route.length > 0);

    trainList.sort((a, b) => b.total_complaints - a.total_complaints);

    return res.status(200).json({ data: trainList, message: 'ok' });

  } catch (error) {
    console.error('[TRAIN_ROUTES] Error:', error.message);
    if (error.code === '42501' || !process.env.SUPABASE_JWT_SECRET || error.message.includes('permission denied')) {
      console.warn('Returning mock train routes due to DB permission error or missing JWT secret');
      
      const stationCoordsMap = {};
      try {
        const { data: stations } = await supabase
          .from('station_coordinates')
          .select('station_code, station_name, lat, lng');
        if (stations) {
          for (const st of stations) {
            stationCoordsMap[st.station_code] = {
              name: st.station_name,
              lat: Number(st.lat),
              lng: Number(st.lng)
            };
          }
        }
      } catch (e) {
        console.warn('Failed to query station coordinates for mock train routes fallback, using defaults');
      }
      
      const defaults = {
        'NDLS': { name: 'New Delhi', lat: 28.6415, lng: 77.2193 },
        'MMCT': { name: 'Mumbai Central', lat: 18.9696, lng: 72.8193 },
        'BRC': { name: 'Vadodara Junction', lat: 22.3106, lng: 73.1812 },
        'RTM': { name: 'Ratlam Junction', lat: 23.3364, lng: 75.0374 },
        'MTJ': { name: 'Mathura Junction', lat: 27.4924, lng: 77.6737 },
        'AGC': { name: 'Agra Cantt', lat: 27.1578, lng: 77.9907 },
        'BPL': { name: 'Bhopal Junction', lat: 23.2599, lng: 77.4126 },
        'HWH': { name: 'Howrah Junction', lat: 22.5834, lng: 88.3426 }
      };
      
      for (const [code, val] of Object.entries(defaults)) {
        if (!stationCoordsMap[code]) {
          stationCoordsMap[code] = val;
        }
      }

      const trainMap = {};
      for (const c of inMemoryComplaints) {
        if (!c.train_number) continue;
        const trainNum = c.train_number.toString().trim();
        if (!trainMap[trainNum]) {
          trainMap[trainNum] = {
            train_number: trainNum,
            train_name: c.train_name || `Express Train ${trainNum}`,
            total_complaints: 0,
            breakdown: {},
            coaches: {},
            list: []
          };
        }
        const t = trainMap[trainNum];
        t.total_complaints += 1;
        const cType = c.complaint_type || 'Other';
        t.breakdown[cType] = (t.breakdown[cType] || 0) + 1;
        const coach = c.coach || 'General';
        t.coaches[coach] = (t.coaches[coach] || 0) + 1;
        t.list.push(c);
      }

      const trainList = Object.values(trainMap).map(t => {
        t.route = getRouteForTrain(t.train_number, stationCoordsMap);
        t.list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        t.sortedBreakdown = Object.entries(t.breakdown).sort((a, b) => b[1] - a[1]).slice(0, 3);
        t.topType = t.sortedBreakdown.length > 0 ? t.sortedBreakdown[0][0] : 'Other';
        return t;
      }).filter(t => t.route && t.route.length > 0);

      trainList.sort((a, b) => b.total_complaints - a.total_complaints);
      return res.status(200).json({ data: trainList, message: 'ok (mocked)' });
    }
    return res.status(500).json({ error: 'Failed to load train route data', code: 'SERVER_ERROR' });
  }
};

// Route Registration Order (CRITICAL)
router.get('/public/heatmap', heatmapHandler);
router.get('/public/stats', statsHandler);
router.get('/public/train-routes', trainRoutesHandler);
router.get('/', verifyToken, listHandler);
router.get('/:id', verifyToken, detailHandler);
router.post('/', verifyToken, complaintValidation, postHandler);
router.patch('/:id/status', verifyToken, statusUpdateValidation, patchHandler);
router.post('/:id/reopen', verifyToken, reopenValidation, reopenHandler);

module.exports = router;
// Reload triggered

