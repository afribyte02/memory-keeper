/**
 * Dashboard Page
 * Main hub showing memory grid, mood stats, quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
  FiPlus, FiCalendar, FiSearch, FiTrendingUp,
  FiImage, FiVideo, FiMic, FiFilter
} from 'react-icons/fi';
import { MdOutlineMemory } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { getMemories, getStats } from '../api/memoryApi';
import MemoryCard from '../components/MemoryCard';
import LoadingSpinner from '../components/LoadingSpinner';
import './Dashboard.css';

const MOODS = ['all','happy','sad','excited','nostalgic','grateful','anxious','peaceful','angry','neutral'];
const MOOD_EMOJI = {
  all:'🌐', happy:'😊', sad:'😢', excited:'🎉', nostalgic:'🌅',
  grateful:'🙏', anxious:'😰', peaceful:'🕊️', angry:'😡', neutral:'😐',
};

export default function Dashboard() {
  const navigate   = useNavigate();
  const { userName } = useAuth();

  const [memories,   setMemories]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [statsLoading,setStatsLoad] = useState(true);
  const [moodFilter, setMoodFilter] = useState('all');
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({});
  const [sortBy,     setSortBy]     = useState('date');
  const [order,      setOrder]      = useState('desc');

  // ── Fetch Memories ───────────────────────────────────────────
  const fetchMemories = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = {
        page: reset ? 1 : page,
        limit: 12,
        mood: moodFilter !== 'all' ? moodFilter : undefined,
        sortBy,
        order,
      };
      const data = await getMemories(params);
      if (reset) {
        setMemories(data.memories);
        setPage(1);
      } else {
        setMemories((prev) => (page === 1 ? data.memories : [...prev, ...data.memories]));
      }
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load memories');
    } finally { setLoading(false); }
  }, [page, moodFilter, sortBy, order]);

  // ── Fetch Stats ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoad(true);
    try {
      const data = await getStats();
      setStats(data.stats);
    } catch { /* stats are non-critical */ }
    finally { setStatsLoad(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchMemories(true); }, [moodFilter, sortBy, order]); // eslint-disable-line
  useEffect(() => { if (page > 1) fetchMemories(); }, [page]); // eslint-disable-line

  const handleDelete = (id) => setMemories((prev) => prev.filter((m) => m._id !== id));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard container">
      {/* ── Hero Header ─────────────────────────────────────── */}
      <section className="dashboard__hero animate-fade-in">
        <div className="dashboard__hero-text">
          <p className="dashboard__greeting text-muted">
            {greeting()}, <span className="text-gradient">{userName}</span> 👋
          </p>
          <h1 className="dashboard__title heading-1">Your Memory Vault</h1>
          <p className="dashboard__sub text-muted">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="dashboard__hero-actions">
          <button id="btn-add-memory" className="btn btn-primary" onClick={() => navigate('/upload')}>
            <FiPlus /> Add Memory
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/on-this-day')}>
            <FiCalendar /> On This Day
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/search')}>
            <FiSearch /> Search
          </button>
        </div>
      </section>

      {/* ── Stats Cards ─────────────────────────────────────── */}
      {!statsLoading && stats && (
        <section className="dashboard__stats stagger-children">
          <div className="stat-card card animate-fade-in">
            <div className="stat-card__icon stat-card__icon--purple">
              <MdOutlineMemory />
            </div>
            <div className="stat-card__info">
              <p className="stat-card__value">{stats.totalMemories}</p>
              <p className="stat-card__label text-muted text-sm">Total Memories</p>
            </div>
          </div>
          <div className="stat-card card animate-fade-in">
            <div className="stat-card__icon stat-card__icon--teal">
              <FiImage />
            </div>
            <div className="stat-card__info">
              <p className="stat-card__value">{stats.totalMedia}</p>
              <p className="stat-card__label text-muted text-sm">Media Files</p>
            </div>
          </div>
          <div className="stat-card card animate-fade-in">
            <div className="stat-card__icon stat-card__icon--gold">
              <FiTrendingUp />
            </div>
            <div className="stat-card__info">
              <p className="stat-card__value">
                {stats.memoriesByYear?.[0]?._id || new Date().getFullYear()}
              </p>
              <p className="stat-card__label text-muted text-sm">Latest Year</p>
            </div>
          </div>
          <div className="stat-card card animate-fade-in">
            <div className="stat-card__icon stat-card__icon--rose">
              <span style={{ fontSize: '1.4rem' }}>
                {MOOD_EMOJI[stats.moodBreakdown?.[0]?._id || 'neutral']}
              </span>
            </div>
            <div className="stat-card__info">
              <p className="stat-card__value" style={{ textTransform: 'capitalize' }}>
                {stats.moodBreakdown?.[0]?._id || 'neutral'}
              </p>
              <p className="stat-card__label text-muted text-sm">Top Mood</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Filters Bar ─────────────────────────────────────── */}
      <section className="dashboard__filters">
        {/* Mood pills */}
        <div className="dashboard__mood-pills">
          {MOODS.map((m) => (
            <button
              key={m}
              className={`mood-pill ${moodFilter === m ? 'mood-pill--active' : ''}`}
              onClick={() => setMoodFilter(m)}
            >
              {MOOD_EMOJI[m]} <span>{m}</span>
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div className="dashboard__sort">
          <FiFilter size={14} className="text-muted" />
          <select
            id="sort-by"
            className="form-control dashboard__sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">By Date</option>
            <option value="createdAt">By Added</option>
            <option value="viewCount">By Views</option>
          </select>
          <select
            id="sort-order"
            className="form-control dashboard__sort-select"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </section>

      {/* ── Memories Grid ───────────────────────────────────── */}
      <section className="dashboard__grid-section">
        {loading && memories.length === 0 ? (
          <div className="dashboard__loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton dashboard__skeleton-card" />
            ))}
          </div>
        ) : memories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧠</div>
            <h2 className="heading-3">No memories yet</h2>
            <p className="text-muted text-sm">
              {moodFilter !== 'all'
                ? `No ${moodFilter} memories found. Try a different mood.`
                : "Start capturing your most precious moments!"}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/upload')}>
              <FiPlus /> Create Your First Memory
            </button>
          </div>
        ) : (
          <>
            <div className="memories-grid stagger-children">
              {memories.map((memory) => (
                <MemoryCard
                  key={memory._id}
                  memory={memory}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Load more */}
            {pagination.hasNextPage && (
              <div className="dashboard__load-more">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                >
                  {loading ? <span className="spinner spinner-sm" /> : 'Load More Memories'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
