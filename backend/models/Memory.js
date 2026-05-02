/**
 * Memory Model — MongoDB Schema
 * Represents a single digital memory entry
 */

const mongoose = require('mongoose');

// ─── Sub-Schema: Media Attachment ─────────────────────────────────────────────
const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      required: true,
    },
    filename: {
      type: String,
      default: '',
    },
    size: {
      type: Number, // bytes
      default: 0,
    },
    duration: {
      type: Number, // seconds (for video/audio)
      default: null,
    },
  },
  { _id: true }
);

// ─── Main Memory Schema ────────────────────────────────────────────────────────
const memorySchema = new mongoose.Schema(
  {
    // Firebase UID — links memory to a specific user
    userId: {
      type: String,
      required: [true, 'userId is required'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },

    // Emotional tag
    mood: {
      type: String,
      enum: [
        'happy',
        'sad',
        'excited',
        'nostalgic',
        'grateful',
        'anxious',
        'peaceful',
        'angry',
        'neutral',
      ],
      default: 'neutral',
    },

    // The actual date this memory occurred (user-specified)
    date: {
      type: Date,
      required: [true, 'Memory date is required'],
      default: Date.now,
    },

    // Attached media files (images, videos, audio)
    media: {
      type: [mediaSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A memory can have at most 10 media attachments',
      },
    },

    // Searchable keyword tags
    tags: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },

    // Location metadata
    location: {
      name: { type: String, default: '' },
      coordinates: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
    },

    // Privacy flag
    isPrivate: {
      type: Boolean,
      default: true,
    },

    // Soft-delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // View count
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Full-text search index on title, description, and tags
memorySchema.index({ title: 'text', description: 'text', tags: 'text' });

// Compound index for "On This Day" feature (userId + date)
memorySchema.index({ userId: 1, date: 1 });

// Compound index for mood filtering per user
memorySchema.index({ userId: 1, mood: 1 });

// ─── Virtual: Year of Memory ──────────────────────────────────────────────────
memorySchema.virtual('year').get(function () {
  return this.date ? new Date(this.date).getFullYear() : null;
});

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
memorySchema.pre('save', function (next) {
  // Normalize tags: deduplicate
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(this.tags.map((t) => t.toLowerCase().trim()))];
  }
  next();
});

// ─── Instance Method: increment view count ────────────────────────────────────
memorySchema.methods.incrementView = async function () {
  this.viewCount += 1;
  return this.save();
};

// ─── Static Method: get mood stats for a user ─────────────────────────────────
memorySchema.statics.getMoodStats = async function (userId) {
  return this.aggregate([
    { $match: { userId, isDeleted: false } },
    { $group: { _id: '$mood', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

// Exclude soft-deleted memories by default
memorySchema.pre(/^find/, function () {
  if (this._conditions.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

module.exports = mongoose.model('Memory', memorySchema);
