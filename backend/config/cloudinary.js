/**
 * Cloudinary Configuration & Multer Storage
 * Handles image, video, and audio uploads
 */

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Dynamic CloudinaryStorage that routes files to correct folders
 * and sets the right resource_type based on mimetype.
 */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = 'memory-keeper/misc';
    let resource_type = 'auto';
    let format = undefined;

    if (file.mimetype.startsWith('image/')) {
      folder = 'memory-keeper/images';
      resource_type = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'memory-keeper/videos';
      resource_type = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      folder = 'memory-keeper/audio';
      resource_type = 'raw';
    }

    const baseName = file.originalname.split('.')[0].replace(/\s+/g, '-');

    return {
      folder,
      resource_type,
      public_id: `${Date.now()}-${baseName}`,
      ...(format && { format }),
    };
  },
});

// Multer middleware with file size limits and type validation
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max (Cloudinary free plan limit)
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
      // Videos
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      // Audio
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
});

module.exports = { cloudinary, upload };
