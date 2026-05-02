/**
 * Community Page
 * Public feed of all memories shared by users (isPrivate: false)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
  FiGlobe, FiImage, FiVideo, FiMic, FiMapPin,
  FiEye, FiFilter, FiChevronDown
} from 'react-icons/fi';
import { getPublicFeed } from '../api/memoryApi';
import LoadingSpinner from '../components/LoadingSpinner';
import './Community.css';

const MOODS = ['all','happy','sad','excited','nostalgic','grateful','anxious','peaceful','angry','neutral'];
const MOOD_EMOJI = {
  all:'🌐', happy:'😊', sad:'😢', excited:'🎉', nostalgic:'🌅',
  grateful:'🙏', anxious:'😰', peaceful:'🕊️', angry:'😡', neutral:'😐',
};

export default function Community() {
  const navigate = useNavigate();

  const [memories,   setMemories]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [moodFilter, setMoodFilter] = useState('all');
  const [sortBy,     setSortBy]     = useState('date');
  const [order,      setOrder]      = useState('desc');
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({});
  const [loadingMore,setLoadingMore]= useState(false);

  const fetchFeed = useCallback(async (reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const data = await getPublicFeed({
        page: reset ? 1 : page,
        limit: 12,
        mood: moodFilter !== 'all' ? moodFilter : undefined,
        sortBy,
        order,
      });
      if (reset) {
        setMemories(data.memories);
        setPage(1);
      } else {
        setMemories((prev) => [...prev, ...data.memories]);
      }
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load community memories');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, moodFilter, sortBy, order]);

  useEffect(() => { fetchFeed(true); }, [moodFilter, sortBy, order]); // eslint-disable-line
  useEffect(() => { if (page > 1) fetchFeed(); }, [page]); // eslint-disable-line

  const handleLoadMore = () => setPage((p) => p + 1);

  return (
    <div className="community container">

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="community__hero animate-fade-in">
        <div className="community__hero-icon">
          <FiGlobe />
        </div>
        <div className="community__hero-text">
          <h1 className="heading-1">Community Memories</h1>
          <p className="text-muted">
            Discover shared moments from all Memory Keeper users.
            {pagination.total > 0 && (
              <> <strong className="text-gradient">{pagination.total}</strong> public memories shared.</>
            )}
          </p>
        </div>
      </section>

      {/* ── Filters ───────────────────────────────────────────── */}
      <section className="community__filters">
        <div className="community__mood-pills">
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
        <div className="community__sort">
          <FiFilter size={14} className="text-muted" />
          <select
            className="form-control community__sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">By Date</option>
            <option value="createdAt">By Added</option>
            <option value="viewCount">By Views</option>
          </select>
          <select
            className="form-control community__sort-select"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </section>

      {/* ── Feed ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="community__skeleton-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton community__skeleton-card" />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌐</div>
          <h2 className="heading-3">No public memories yet</h2>
          <p className="text-muted text-sm">
            {moodFilter !== 'all'
              ? `No ${moodFilter} public memories found.`
              : 'Be the first to share a memory with the community!'}
          </p>
        </div>
      ) : (
        <>
          <div className="community__grid stagger-children">
            {memories.map((memory) => (
              <CommunityCard
                key={memory._id}
                memory={memory}
                onView={() => navigate(`/memory/${memory._id}`)}
              />
            ))}
          </div>

          {pagination.hasNextPage && (
            <div className="community__load-more">
              <button
                className="btn btn-secondary"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="spinner spinner-sm" />
                ) : (
                  <><FiChevronDown /> Load More</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Community Card (read-only, no edit/delete) ─────────────────────────────────
function CommunityCard({ memory, onView }) {
  const [imgError, setImgError] = useState(false);
  const { title, description, mood, date, media, tags, location, viewCount } = memory;

  const thumbnail = media?.find((m) => m.type === 'image');
  const hasVideo  = media?.some((m) => m.type === 'video');
  const hasAudio  = media?.some((m) => m.type === 'audio');

  return (
    <article
      className="comm-card card animate-fade-in"
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onView()}
      aria-label={`View memory: ${title}`}
    >
      {/* Thumbnail */}
      <div className="comm-card__thumb">
        {thumbnail && !imgError ? (
          <img
            src={thumbnail.url}
            alt={title}
            className="comm-card__thumb-img"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="comm-card__thumb-placeholder">
            {hasVideo ? <FiVideo size={32} /> : hasAudio ? <FiMic size={32} /> : <FiImage size={32} />}
          </div>
        )}
        <div className="comm-card__thumb-overlay" />
        <span className={`comm-card__mood-badge badge badge-mood mood-${mood}`}>
          {MOOD_EMOJI[mood]} {mood}
        </span>
        <div className="comm-card__public-tag">
          <FiGlobe size={10} /> Public
        </div>
      </div>

      {/* Body */}
      <div className="comm-card__body">
        <p className="comm-card__date text-xs text-muted">
          {date ? format(new Date(date), 'MMMM d, yyyy') : ''}
        </p>
        <h3 className="comm-card__title">{title}</h3>
        {description && (
          <p className="comm-card__desc text-sm text-muted">
            {description.length > 90 ? description.slice(0, 90) + '…' : description}
          </p>
        )}
        {tags?.length > 0 && (
          <div className="comm-card__tags">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="memory-card__tag">#{tag}</span>
            ))}
          </div>
        )}
        {location?.name && (
          <p className="comm-card__location text-xs">
            <FiMapPin size={10} /> {location.name}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="comm-card__footer">
        <span className="comm-card__views text-xs text-muted">
          <FiEye size={12} /> {viewCount || 0} views
        </span>
        <span className="comm-card__view-link text-xs">
          View memory →
        </span>
      </div>
    </article>
  );
}
