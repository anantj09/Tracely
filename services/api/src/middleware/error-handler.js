/**
 * Global Express error handling middleware.
 */
function errorHandler(err, req, res, next) {
  // Log the error internally
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Check if response has already been sent to client
  if (res.headersSent) {
    return next(err);
  }

  // Hide detailed errors from client to prevent information leakage
  const message = 'Internal server error';

  return res.status(500).json({
    error: message,
    code: 'INTERNAL_ERROR'
  });
}

module.exports = errorHandler;
