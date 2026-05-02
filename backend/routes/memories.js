/**
 * Memories Routes — /api/memories
 * Full CRUD + "On This Day" + Public Feed
 */

const express = require('express');
const router = express.Router();
const Memory = require('../models/Memory');
const { verifyToken } = require('../middleware/firebaseAuth');

// ─── GET /api/memories/public ──────────────────────────────────────────────────
// Public community feed — returns all public memories from every user
router.get('/public', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 12, mood, sortBy = 'date', order = 'desc' } = req.query;

    const query = { isPrivate: false };
    if (mood && mood !== 'all') query.mood = mood;

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField = ['date', 'createdAt', 'viewCount'].includes(sortBy) ? sortBy : 'date';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [memories, total] = await Promise.all([
      Memory.find(query)
        .sort({ [sortField]: sortOrder })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Memory.countDocuments(query),
    ]);

    res.json({
      success: true,
      memories,
      pagination: {
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        total,
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('GET /memories/public error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/memories ─────────────────────────────────────────────────────────
// Fetch paginated memories for the authenticated user
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      mood,
      sortBy = 'date',
      order = 'desc',
      year,
    } = req.query;

    const query = { userId: req.user.uid };

    // Optional mood filter
    if (mood) query.mood = mood;

    // Optional year filter
    if (year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      query.date = { $gte: start, $lte: end };
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField = ['date', 'createdAt', 'title', 'viewCount'].includes(sortBy)
      ? sortBy
      : 'date';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [memories, total] = await Promise.all([
      Memory.find(query)
        .sort({ [sortField]: sortOrder })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Memory.countDocuments(query),
    ]);

    res.json({
      success: true,
      memories,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNextPage: parseInt(page) < Math.ceil(total / limit),
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('GET /memories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/memories/stats ───────────────────────────────────────────────────
// Get mood statistics and memory counts
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const [moodStats, totalCount, mediaCount] = await Promise.all([
      Memory.getMoodStats(userId),
      Memory.countDocuments({ userId }),
      Memory.aggregate([
        { $match: { userId } },
        { $project: { mediaCount: { $size: '$media' } } },
        { $group: { _id: null, total: { $sum: '$mediaCount' } } },
      ]),
    ]);

    // Get memories grouped by year
    const byYear = await Memory.aggregate([
      { $match: { userId } },
      { $group: { _id: { $year: '$date' }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalMemories: totalCount,
        totalMedia: mediaCount[0]?.total || 0,
        moodBreakdown: moodStats,
        memoriesByYear: byYear,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/memories/on-this-day ────────────────────────────────────────────
// Retrieve memories from the same day in previous years
router.get('/on-this-day', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-indexed
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    const memories = await Memory.aggregate([
      {
        $match: { userId: req.user.uid },
      },
      {
        $addFields: {
          memMonth: { $month: '$date' },
          memDay: { $dayOfMonth: '$date' },
          memYear: { $year: '$date' },
        },
      },
      {
        $match: {
          memMonth: currentMonth,
          memDay: currentDay,
          memYear: { $lt: currentYear },
        },
      },
      {
        $addFields: {
          yearsAgo: { $subtract: [currentYear, '$memYear'] },
        },
      },
      { $sort: { memYear: -1 } },
    ]);

    res.json({
      success: true,
      date: today.toISOString().split('T')[0],
      memories,
      count: memories.length,
    });
  } catch (error) {
    console.error('GET /on-this-day error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/memories/:id ─────────────────────────────────────────────────────
// Get a single memory by ID — accessible if own memory OR public memory
router.get('/:id', verifyToken, async (req, res) => {
  try {
    // Allow access if: memory belongs to the current user OR memory is public
    const memory = await Memory.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user.uid },       // owner always has access
        { isPrivate: false },           // any user can view public memories
      ],
    });

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    // Increment view count
    await memory.incrementView();

    res.json({ success: true, memory });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid memory ID' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/memories ────────────────────────────────────────────────────────
// Create a new memory
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, mood, date, media, tags, location, isPrivate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const memory = new Memory({
      userId: req.user.uid,
      title: title.trim(),
      description: description?.trim() || '',
      mood: mood || 'neutral',
      date: date ? new Date(date) : new Date(),
      media: media || [],
      tags: tags || [],
      location: location || { name: '', coordinates: { lat: null, lng: null } },
      isPrivate: isPrivate !== undefined ? isPrivate : true,
    });

    const saved = await memory.save();

    res.status(201).json({
      success: true,
      message: 'Memory created successfully',
      memory: saved,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── PUT /api/memories/:id ─────────────────────────────────────────────────────
// Update a memory
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const allowedUpdates = ['title', 'description', 'mood', 'date', 'media', 'tags', 'location', 'isPrivate'];
    const updates = {};
    allowedUpdates.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const memory = await Memory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    res.json({
      success: true,
      message: 'Memory updated successfully',
      memory,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DELETE /api/memories/:id ──────────────────────────────────────────────────
// Soft-delete a memory
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const memory = await Memory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    res.json({
      success: true,
      message: 'Memory deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
