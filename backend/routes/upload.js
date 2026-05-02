/**
 * Upload Routes — /api/upload
 * Handles media file uploads to Cloudinary
 */

const express = require('express');
const router = express.Router();
const { upload, cloudinary } = require('../config/cloudinary');
const { verifyToken } = require('../middleware/firebaseAuth');

// ─── POST /api/upload/single ───────────────────────────────────────────────────
// Upload a single media file
router.post('/single', verifyToken, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = req.file;

    // Determine media type from mimetype
    let mediaType = 'image';
    if (file.mimetype.startsWith('video/')) mediaType = 'video';
    else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';

    res.json({
      success: true,
      file: {
        url: file.path,
        publicId: file.filename,
        type: mediaType,
        filename: file.originalname,
        size: file.size || 0,
      },
    });
  } catch (error) {
    console.error('Upload single error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/upload/multiple ─────────────────────────────────────────────────
// Upload up to 5 media files at once
router.post('/multiple', verifyToken, upload.array('media', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const files = req.files.map((file) => {
      let mediaType = 'image';
      if (file.mimetype.startsWith('video/')) mediaType = 'video';
      else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';

      return {
        url: file.path,
        publicId: file.filename,
        type: mediaType,
        filename: file.originalname,
        size: file.size || 0,
      };
    });

    res.json({
      success: true,
      count: files.length,
      files,
    });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DELETE /api/upload/:publicId ──────────────────────────────────────────────
// Remove a file from Cloudinary
router.delete('/:publicId', verifyToken, async (req, res) => {
  try {
    // publicId may contain slashes, so decode URI component
    const publicId = decodeURIComponent(req.params.publicId);
    const { resourceType = 'image' } = req.query;

    const validTypes = ['image', 'video', 'raw'];
    if (!validTypes.includes(resourceType)) {
      return res.status(400).json({ success: false, error: 'Invalid resourceType. Use: image, video, or raw' });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === 'ok') {
      return res.json({ success: true, message: 'File deleted from Cloudinary' });
    }

    res.status(400).json({ success: false, message: `Cloudinary response: ${result.result}` });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Error handler for Multer ──────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File too large. Maximum size is 100MB.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, error: 'Too many files. Maximum is 5 files at once.' });
  }
  if (err.message && err.message.includes('Unsupported file type')) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

module.exports = router;
