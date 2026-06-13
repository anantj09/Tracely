const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase-client');
const { verifyToken } = require('../middleware/auth');
const {
  calculateCrowdingScore,
  haversineDistance,
  CONFIRMED_BROKEN_THRESHOLD,
  VOTE_WINDOW_HOURS,
  CHECKIN_RADIUS_METRES
} = require('../services/demand-service');

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: errors.array() });
  }
  next();
};

// ENDPOINT D: POST /api/amenities/vote
router.post(
  '/vote',
  verifyToken,
  [
    body('amenity_id').isUUID().withMessage('Must be a valid UUID'),
    body('vote').isIn(['WORKING', 'BROKEN']).withMessage('Must be WORKING or BROKEN')
  ],
  validate,
  async (req, res) => {
    try {
      const { amenity_id, vote } = req.body;
      const user_id = req.user.user_id;

      // 1. Fetch amenity
      const { data: amenity, error: amenityError } = await supabase
        .from('amenities')
        .select('*')
        .eq('id', amenity_id)
        .single();

      if (amenityError || !amenity) {
        return res.status(404).json({ error: 'Amenity not found.', code: 'AMENITY_NOT_FOUND' });
      }

      // 2. Insert vote
      const { error: insertError } = await supabase
        .from('amenity_votes')
        .insert({ amenity_id, user_id, vote });

      if (insertError) {
        if (insertError.code === '23505') {
          return res.status(429).json({ error: 'You already voted for this amenity recently.', code: 'ALREADY_VOTED' });
        }
        throw insertError;
      }

      // 3. Count recent votes
      const windowStart = new Date(Date.now() - VOTE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
      const { data: recentVotes, error: votesError } = await supabase
        .from('amenity_votes')
        .select('vote')
        .eq('amenity_id', amenity_id)
        .gte('created_at', windowStart);

      if (votesError) throw votesError;

      // 4. Count working/broken
      const brokenCount = recentVotes.filter(v => v.vote === 'BROKEN').length;
      const workingCount = recentVotes.filter(v => v.vote === 'WORKING').length;

      // 5. Determine newStatus
      let newStatus;
      if (brokenCount >= CONFIRMED_BROKEN_THRESHOLD) {
        newStatus = 'CONFIRMED_BROKEN';
      } else if (workingCount >= CONFIRMED_BROKEN_THRESHOLD && amenity.current_status === 'CONFIRMED_BROKEN') {
        newStatus = 'WORKING';
      } else if (brokenCount > workingCount) {
        newStatus = 'BROKEN';
      } else if (workingCount > brokenCount) {
        newStatus = 'WORKING';
      } else {
        newStatus = amenity.current_status;
      }

      // 6. UPDATE amenity
      const { data: updatedAmenity, error: updateError } = await supabase
        .from('amenities')
        .update({
          current_status: newStatus,
          last_vote_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', amenity_id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 7. Alert
      if (newStatus === 'CONFIRMED_BROKEN' && amenity.current_status !== 'CONFIRMED_BROKEN') {
        console.log(`[AMENITY_ALERT] station=${amenity.station_code} amenity="${amenity.label}" CONFIRMED_BROKEN at ${new Date().toISOString()}`);
      }

      // 8. Return
      return res.status(200).json({ data: updatedAmenity, message: 'Vote recorded successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
);

// ENDPOINT E: POST /api/amenities/vendor-review
router.post(
  '/vendor-review',
  verifyToken,
  [
    body('vendor_id').isUUID().withMessage('Must be a valid UUID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Must be between 1 and 5'),
    body('comment').optional().isLength({ max: 100 }).withMessage('Max length 100 characters')
  ],
  validate,
  async (req, res) => {
    try {
      const { vendor_id, rating, comment } = req.body;
      const user_id = req.user.user_id;

      // 1. Fetch vendor
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendor_id)
        .single();

      if (vendorError || !vendor) {
        return res.status(404).json({ error: 'Vendor not found.', code: 'VENDOR_NOT_FOUND' });
      }

      // 2. Insert review
      const { error: insertError } = await supabase
        .from('vendor_reviews')
        .insert({ vendor_id, user_id, rating, comment });

      if (insertError) {
        if (insertError.code === '23505') {
          return res.status(409).json({ error: 'You already reviewed this vendor today.', code: 'DUPLICATE_REVIEW' });
        }
        throw insertError;
      }

      // 3. Recalculate rating
      const { data: reviews, error: reviewsError } = await supabase
        .from('vendor_reviews')
        .select('rating')
        .eq('vendor_id', vendor_id);

      if (reviewsError) throw reviewsError;

      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          average_rating: parseFloat(avg.toFixed(2)),
          review_count: reviews.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor_id);

      if (updateError) throw updateError;

      // 4. Fetch updated vendor
      const { data: updatedVendor, error: refetchError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendor_id)
        .single();

      if (refetchError) throw refetchError;

      return res.status(201).json({ data: { vendor: updatedVendor }, message: "Review submitted." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
);

// ENDPOINT F: POST /api/amenities/hawker-report
router.post(
  '/hawker-report',
  verifyToken,
  [
    body('station_code').notEmpty().withMessage('Station code required'),
    body('description').optional().isLength({ max: 200 }),
    body('schematic_x').optional().isFloat(),
    body('schematic_y').optional().isFloat()
  ],
  validate,
  async (req, res) => {
    try {
      const { station_code, description, schematic_x, schematic_y } = req.body;
      const user_id = req.user.user_id;

      // 1. Insert report
      const { data: report, error: insertError } = await supabase
        .from('hawker_reports')
        .insert({
          user_id,
          station_code,
          description,
          schematic_x,
          schematic_y,
          status: 'PENDING'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Log
      console.log(`[HAWKER_REPORT] station=${station_code} user=${user_id} at=${new Date().toISOString()}`);

      // 3. Return
      return res.status(201).json({ data: report, message: "Report submitted to station management." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
);

// ENDPOINT G: POST /api/amenities/checkin
router.post(
  '/checkin',
  verifyToken,
  [
    body('station_code').notEmpty(),
    body('lat').isFloat(),
    body('lng').isFloat()
  ],
  validate,
  async (req, res) => {
    try {
      const { station_code, lat, lng } = req.body;
      const user_id = req.user.user_id;

      // 2. Fetch coords
      const { data: station, error: fetchError } = await supabase
        .from('station_coordinates')
        .select('lat, lng')
        .eq('station_code', station_code)
        .single();

      if (fetchError || !station) {
        return res.status(400).json({ error: 'Station not found.', code: 'STATION_NOT_FOUND' });
      }

      // 3. Calculate dist
      const dist = haversineDistance(lat, lng, station.lat, station.lng);

      // 4. Validate dist
      if (dist > CHECKIN_RADIUS_METRES) {
        return res.status(400).json({
          error: "You don't appear to be at this station.",
          code: 'NOT_AT_STATION',
          distance_metres: Math.round(dist)
        });
      }

      // 5. Delete existing
      await supabase
        .from('station_checkins')
        .delete()
        .eq('user_id', user_id)
        .eq('station_code', station_code)
        .gt('expires_at', new Date().toISOString());

      // 6. Insert new
      const expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const { data: checkin, error: insertError } = await supabase
        .from('station_checkins')
        .insert({
          user_id,
          station_code,
          lat,
          lng,
          expires_at
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 7. Count active
      const { count, error: countError } = await supabase
        .from('station_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('station_code', station_code)
        .gt('expires_at', new Date().toISOString());

      if (countError && countError.code !== 'PGRST116') throw countError;

      // 8. Return
      return res.status(201).json({
        data: {
          checkin,
          active_count: count || 0,
          is_crowded: (count || 0) >= 10
        },
        message: "Checked in successfully."
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
);

// ENDPOINT H: GET /api/amenities/demand/forecast (NO AUTH)
router.get(
  '/demand/forecast',
  async (req, res) => {
    try {
      // 1. Get date range
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const endDateStr = endDate.toISOString().split('T')[0];

      // 2. Query intents
      const { data: intents, error } = await supabase
        .from('travel_intents')
        .select('from_station, to_station, travel_date')
        .gte('travel_date', todayStr)
        .lte('travel_date', endDateStr);

      if (error) throw error;

      // Group by from_station, to_station, travel_date manually
      const groups = {};
      intents.forEach(intent => {
        const key = `${intent.from_station}_${intent.to_station}_${intent.travel_date}`;
        if (!groups[key]) {
          groups[key] = {
            from_station: intent.from_station,
            to_station: intent.to_station,
            travel_date: intent.travel_date,
            count: 0
          };
        }
        groups[key].count++;
      });

      const forecastObj = {};
      const surge_alerts = [];

      // 3 & 4. Build forecast
      Object.values(groups).forEach(g => {
        const score = calculateCrowdingScore(g.from_station, g.to_station, g.travel_date, g.count);
        const is_surge = score >= 8;
        const routeKey = `${g.from_station}-${g.to_station}`;

        if (!forecastObj[routeKey]) {
          forecastObj[routeKey] = {
            from_station: g.from_station,
            to_station: g.to_station,
            dates: []
          };
        }

        const dateEntry = {
          date: g.travel_date,
          intent_count: g.count,
          crowding_score: score,
          is_surge: is_surge
        };
        forecastObj[routeKey].dates.push(dateEntry);

        // 5. surge alerts
        if (is_surge) {
          surge_alerts.push({
            from_station: g.from_station,
            to_station: g.to_station,
            date: g.travel_date,
            intent_count: g.count,
            score: score
          });
        }
      });

      const forecast = Object.values(forecastObj);

      // 6. Return
      return res.status(200).json({
        data: {
          forecast,
          surge_alerts
        },
        message: 'ok'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
);

module.exports = router;
