// services/api/src/routes/upload.js
// Backend file upload proxy — bypasses Supabase Storage RLS using service-role key.
// Used by demo/unauthenticated users when direct frontend uploads fail.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const supabase = require('../db/supabase-client');

// Configure multer for in-memory storage (files stay in RAM, not written to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/**
 * POST /api/upload
 * Accepts multipart/form-data with:
 *   - file: the binary file (required)
 *   - bucket: the Supabase Storage bucket name (required)
 *   - filePath: the desired path inside the bucket (required)
 *
 * Returns: { data: { publicUrl: "..." }, message: "ok" }
 */
router.post('/', verifyToken, upload.single('file'), async (req, res, next) => {
  try {
    const { bucket, filePath } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided', code: 'VALIDATION_ERROR' });
    }
    if (!bucket) {
      return res.status(400).json({ error: 'bucket field is required', code: 'VALIDATION_ERROR' });
    }
    if (!filePath) {
      return res.status(400).json({ error: 'filePath field is required', code: 'VALIDATION_ERROR' });
    }

    // Whitelist of allowed buckets
    const allowedBuckets = ['hazard-photos', 'sos-audio', 'complaint-photos', 'tatkal-documents'];
    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({ error: `Bucket "${bucket}" is not allowed`, code: 'VALIDATION_ERROR' });
    }

    // Upload using service-role client (bypasses RLS)
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[UPLOAD PROXY] Failed to upload to ${bucket}/${filePath}:`, uploadError.message);
      return res.status(500).json({ error: 'Upload failed', code: 'UPLOAD_ERROR', details: uploadError.message });
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return res.status(200).json({
      data: { publicUrl: urlData?.publicUrl || null },
      message: 'ok'
    });
  } catch (error) {
    console.error('[UPLOAD PROXY] Error:', error.message);
    next(error);
  }
});

module.exports = router;
