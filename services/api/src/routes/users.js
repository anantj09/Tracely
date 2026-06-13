const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const userDb = require('../db/user-db');
const journeyDb = require('../db/journey-db');

const router = express.Router();

/**
 * GET /api/users/me
 * Protected. Returns full profile + active journey of the logged-in passenger.
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // 1. Fetch user profile
    let user;
    try {
      user = await userDb.getUserById(userId);
    } catch (dbErr) {
      console.error('Database error in GET /me user profile:', dbErr.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (userId === 'afa5b750-76ce-49b4-9152-268206e80f0c' || userId === '1bfc2d7c-2090-4776-8683-470b363d77b1' || userId === 'c0a80101-76ce-49b4-9152-268206e80f0d' || userId === '65c72d32-1610-4c4b-ac4c-3aa4204d6846' || !process.env.SUPABASE_JWT_SECRET || dbErr.code === '42501') {
       *   console.warn('Using mock user profile fallback');
       *   user = {
       *     id: userId,
       *     phone: req.user.phone || '9999999999',
       *     name: 'Demo Passenger',
       *     emergency_contacts: [],
       *     preferred_class: 'SL',
       *     frequent_routes: [],
       *     is_verified: true
       *   };
       * } else {
       *   throw dbErr;
       * }
       */
      throw dbErr;
    }

    if (!user) {
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (userId === 'afa5b750-76ce-49b4-9152-268206e80f0c' || !process.env.SUPABASE_JWT_SECRET) {
       *   user = { id: userId, phone: req.user.phone || '9999999999', name: 'Demo Passenger', ... };
       * } else {
       */
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      /* } */
    }

    // 2. Fetch active/upcoming journey
    let activeJourney = null;
    try {
      activeJourney = await journeyDb.getActiveJourney(userId);
    } catch (dbErr) {
      console.error('Database error in GET /me journey:', dbErr.message);
      /* ORIGINAL MOCK FALLBACK — uncomment for registered-user-only mode
       * if (userId === 'afa5b750-76ce-49b4-9152-268206e80f0c' || !process.env.SUPABASE_JWT_SECRET || dbErr.code === '42501') {
       *   activeJourney = {
       *     train_number: '12951',
       *     train_name: 'Mumbai Rajdhani Express',
       *     coach: 'B3',
       *     berth: '42',
       *     boarding_station: 'NDLS',
       *     destination_station: 'MMCT',
       *     travel_date: new Date().toISOString().split('T')[0],
       *     class: '3A',
       *     status: 'CONFIRMED'
       *   };
       * } else {
       *   throw dbErr;
       * }
       */
      // Journey fetch failure is non-blocking — user can still use the app
      console.warn('Journey fetch failed, continuing without active journey.');
    }

    // 3. Return response
    return res.status(200).json({
      data: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        emergency_contacts: user.emergency_contacts,
        preferred_class: user.preferred_class,
        frequent_routes: user.frequent_routes,
        is_verified: user.is_verified,
        active_journey: activeJourney || null
      },
      message: 'ok'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/users/lookup/:userId
 * Lookup a user's public info (name, age, gender) by their unique user_id.
 * Used by Tatkal passenger form to auto-fill details.
 */
router.get('/lookup/:userId', verifyToken, async (req, res, next) => {
  try {
    const lookupId = req.params.userId;

    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(lookupId)) {
      return res.status(400).json({
        error: 'Invalid User ID format. Must be a valid UUID.',
        code: 'INVALID_ID_FORMAT'
      });
    }

    const user = await userDb.getUserById(lookupId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found. Please check the User ID.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Return public-safe user info for Tatkal passenger auto-fill
    return res.status(200).json({
      data: {
        id: user.id,
        name: user.name || 'Unknown',
        age: user.age || null,
        gender: user.gender || null,
        phone_masked: user.phone ? user.phone.substring(0, 2) + '****' + user.phone.substring(6) : null,
      },
      message: 'ok'
    });
  } catch (error) {
    console.error('User lookup error:', error.message);
    return next(error);
  }
});

/**
 * PATCH /api/users/me
 * Protected. Allows user to update their own profile.
 */
router.patch(
  '/me',
  verifyToken,
  // 1. Strict Whitelist Check Middleware
  (req, res, next) => {
    const whitelist = ['name', 'emergency_contacts', 'preferred_class', 'age', 'gender'];
    const bodyKeys = Object.keys(req.body);
    for (const key of bodyKeys) {
      if (!whitelist.includes(key)) {
        return res.status(400).json({
          error: `Unknown field: ${key}`,
          code: 'VALIDATION_ERROR'
        });
      }
    }
    return next();
  },
  // 2. express-validator Schemas
  [
    body('name')
      .optional()
      .isString()
      .withMessage('Name must be a string')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('emergency_contacts')
      .optional()
      .isArray({ max: 3 })
      .withMessage('Emergency contacts must be an array with at most 3 items'),
    body('emergency_contacts.*')
      .isString()
      .isLength({ min: 10, max: 10 })
      .isNumeric()
      .withMessage('Each emergency contact must be a 10-digit numeric string'),
    body('preferred_class')
      .optional()
      .isString()
      .isIn(['SL', '3A', '2A', '1A', 'GEN'])
      .withMessage('Preferred class must be one of: SL, 3A, 2A, 1A, GEN'),
    body('age')
      .optional()
      .isInt({ min: 1, max: 120 })
      .withMessage('Age must be between 1 and 120'),
    body('gender')
      .optional()
      .isString()
      .isIn(['M', 'F', 'O'])
      .withMessage('Gender must be one of: M, F, O')
  ],
  async (req, res, next) => {
    // 3. Evaluate express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array().map((err) => ({
          field: err.param || err.path,
          message: err.msg
        }))
      });
    }

    try {
      const userId = req.user.user_id;
      const { name, emergency_contacts, preferred_class, age, gender } = req.body;

      // Extract only provided updates
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (emergency_contacts !== undefined) updates.emergency_contacts = emergency_contacts;
      if (preferred_class !== undefined) updates.preferred_class = preferred_class;
      if (age !== undefined) updates.age = age;
      if (gender !== undefined) updates.gender = gender;

      // 4. Perform database update
      const updatedUser = await userDb.updateUser(userId, updates);

      // 5. Send updated profile payload (no active_journey in response)
      return res.status(200).json({
        data: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          name: updatedUser.name,
          emergency_contacts: updatedUser.emergency_contacts,
          preferred_class: updatedUser.preferred_class,
          frequent_routes: updatedUser.frequent_routes,
          is_verified: updatedUser.is_verified
        },
        message: 'ok'
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
