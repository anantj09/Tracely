require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { verifyToken } = require('./middleware/auth');
const errorHandler = require('./middleware/error-handler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global 8-second request timeout middleware
app.use((req, res, next) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timed out',
        code: 'TIMEOUT'
      });
    }
  }, 8000);

  res.on('finish', () => clearTimeout(timeoutId));
  res.on('close', () => clearTimeout(timeoutId));

  next();
});

// Log requests using morgan in non-production environments
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    return res.status(200).json({
      data: {
        status: 'ok',
        timestamp: Date.now()
      },
      message: 'ok'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to retrieve system status',
      code: 'SERVER_ERROR'
    });
  }
});

// Auth router
app.use('/api/auth', require('./routes/auth'));

// Users router
app.use('/api/users', require('./routes/users'));

// Journeys router
app.use('/api/journeys', require('./routes/journeys'));

// Conditional routes for Members 2-5 (fail-safe if files do not exist yet)
const safeRequire = (path) => {
  try { return require(path); } catch (e) { return null; }
};
const tatkalRoutes = safeRequire('./routes/tatkal');
const complaintRoutes = safeRequire('./routes/complaints');
const safetyRoutes = safeRequire('./routes/safety');
const amenityRoutes = safeRequire('./routes/amenities');

if (tatkalRoutes) {
  app.use('/api/tatkal', tatkalRoutes);
  const tatkalFireJob = safeRequire('./jobs/tatkalFireJob');
  if (tatkalFireJob) {
    tatkalFireJob.start();
  }
}
if (complaintRoutes) app.use('/api/complaints', complaintRoutes);
if (safetyRoutes) app.use('/api/safety', safetyRoutes);
if (amenityRoutes) app.use('/api/amenities', amenityRoutes);

// amenities-extra: vote, vendor-review, hawker-report, checkin, demand/forecast
// These are in a separate file to keep amenities.js under 300 lines
const amenityExtraRoutes = safeRequire('./routes/amenities-extra');
if (amenityExtraRoutes) app.use('/api/amenities', amenityExtraRoutes);

// Upload proxy — uses service-role key to bypass Supabase Storage RLS for demo users
const uploadRoutes = safeRequire('./routes/upload');
if (uploadRoutes) app.use('/api/upload', uploadRoutes);


// Protected test endpoint for verification
app.get('/api/protected', verifyToken, (req, res) => {
  try {
    return res.status(200).json({
      data: {
        message: 'Access granted to protected route',
        user: req.user
      },
      message: 'ok'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Protected route execution failed',
      code: 'SERVER_ERROR'
    });
  }
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND'
  });
});

// Mount global error handler as the last middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Tracely API running on port ${PORT}`);
});

// DEPLOYMENT NOTE: Set RENDER_EXTERNAL_URL=https://tracely-z057.onrender.com in Render env vars
// This enables the keep-alive ping to prevent the free tier from sleeping before the demo.
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    const http = RENDER_URL.startsWith('https') ? require('https') : require('http');
    http.get(`${RENDER_URL}/api/health`, (res) => {
      console.log(`Keep-alive ping status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`Keep-alive ping failed: ${err.message}`);
    });
  }, 5 * 60 * 1000); // ping every 5 minutes
}


