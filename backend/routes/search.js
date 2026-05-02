/**
 * Search Routes — /api/search
 * Full-text keyword search + mood/date/tag filters
 */

const express = require('express');
const router = express.Router();
const Memory = require('../models/Memory');
const { verifyToken } = require('../middleware/firebaseAuth');

// ─── GET /api/search ───────────────────────────────────────────────────────────
// Search memories with optional keyword query and filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      q,                   // keyword search
      mood,                // mood filter
      startDate,           // date range start (ISO string)
      endDate,             // date range end (ISO string)
      tags,                // comma-separated tags
      page = 1,
      limit = 12,
    } = req.query;

    const query = { userId: req.user.uid };

    // ── Full-text keyword search ──
    if (q && q.trim().length > 0) {
      query.$text = { $search: q.trim() };
    }

    // ── Mood filter ──
    if (mood && mood !== 'all') {
      query.mood = mood;
    }

    // ── Date range filter ──
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // include full end day
        query.date.$lte = end;
      }
    }

    // ── Tags filter ──
    if (tags && tags.trim().length > 0) {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tagArray.length > 0) {
        query.tags = { $in: tagArray };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort: relevance score if text search, else by date desc
    let findQuery = Memory.find(query);
    let countQuery = Memory.countDocuments(query);

    if (q && q.trim().length > 0) {
      findQuery = findQuery
        .select({ score: { $meta: 'textScore' }, title: 1, description: 1, mood: 1, date: 1, media: 1, tags: 1 })
        .sort({ score: { $meta: 'textScore' }, date: -1 });
    } else {
      findQuery = findQuery.sort({ date: -1 });
    }

    const [memories, total] = await Promise.all([
      findQuery.limit(parseInt(limit)).skip(skip).lean(),
      countQuery,
    ]);

    res.json({
      success: true,
      query: { q, mood, startDate, endDate, tags },
      memories,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        hasNextPage: parseInt(page) < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/search/suggestions ──────────────────────────────────────────────
// Autocomplete suggestions based on partial query
router.get('/suggestions', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const memories = await Memory.find(
      {
        userId: req.user.uid,
        $text: { $search: q.trim() },
      },
      { score: { $meta: 'textScore' }, title: 1 }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(7)
      .lean();

    const suggestions = memories.map((m) => ({
      id: m._id,
      title: m.title,
    }));

    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/search/tags ──────────────────────────────────────────────────────
// Get all unique tags used by the authenticated user
router.get('/tags', verifyToken, async (req, res) => {
  try {
    const result = await Memory.aggregate([
      { $match: { userId: req.user.uid } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    res.json({
      success: true,
      tags: result.map((r) => ({ tag: r._id, count: r.count })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
