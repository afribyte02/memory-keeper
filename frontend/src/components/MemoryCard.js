/**
 * MemoryCard Component
 * Displays a single memory in the grid with media preview, mood badge, and actions
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { FiTrash2, FiEdit2, FiEye, FiImage, FiVideo, FiMic, FiMapPin } from 'react-icons/fi';
import { deleteMemory } from '../api/memoryApi';
import './MemoryCard.css';

const MOOD_EMOJI = {
  happy: '😊', sad: '😢', excited: '🎉', nostalgic: '🌅',
  grateful: '🙏', anxious: '😰', peaceful: '🕊️', angry: '😡', neutral: '😐',
};

const MEDIA_ICON = { image: <FiImage />, video: <FiVideo />, audio: <FiMic /> };

export default function MemoryCard({ memory, onDelete }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { _id, title, description, mood, date, media, tags, location } = memory;

  // Pick the first image for the card thumbnail
  const thumbnail = media?.find((m) => m.type === 'image');
  const hasVideo  = media?.some((m) => m.type === 'video');
  const hasAudio  = media?.some((m) => m.type === 'audio');

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this memory? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteMemory(_id);
      toast.success('Memory deleted');
      onDelete?.(_id);
    } catch (err) {
      toast.error(err.message || 'Delete failed');
      setDeleting(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/upload?edit=${_id}`);
  };

  return (
    <article
      className="memory-card card animate-fade-in"
      onClick={() => navigate(`/memory/${_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/memory/${_id}`)}
      aria-label={`View memory: ${title}`}
    >
      {/* ── Thumbnail ─────────────────────────── */}
      <div className="memory-card__thumb">
        {thumbnail && !imgError ? (
          <img
            src={thumbnail.url}
            alt={title}
            className="memory-card__thumb-img"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="memory-card__thumb-placeholder">
            {hasVideo ? <FiVideo size={32} /> : hasAudio ? <FiMic size={32} /> : <FiImage size={32} />}
          </div>
        )}

        {/* Overlay gradient */}
        <div className="memory-card__thumb-overlay" />

        {/* Mood badge on thumb */}
        <span className={`memory-card__mood-badge badge badge-mood mood-${mood}`}>
          {MOOD_EMOJI[mood]} {mood}
        </span>

        {/* Media type icons */}
        <div className="memory-card__media-icons">
          {media?.length > 0 && media.map((m, i) => (
            <span key={i} className="memory-card__media-icon" title={m.type}>
              {MEDIA_ICON[m.type]}
            </span>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────── */}
      <div className="memory-card__body">
        <p className="memory-card__date text-xs text-muted">
          {date ? format(new Date(date), 'MMMM d, yyyy') : ''}
        </p>

        <h3 className="memory-card__title">{title}</h3>

        {description && (
          <p className="memory-card__desc text-sm text-muted">
            {description.length > 90 ? description.slice(0, 90) + '…' : description}
          </p>
        )}

        {/* Tags */}
        {tags?.length > 0 && (
          <div className="memory-card__tags">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="memory-card__tag">#{tag}</span>
            ))}
            {tags.length > 3 && (
              <span className="memory-card__tag memory-card__tag--more">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Location */}
        {location?.name && (
          <p className="memory-card__location text-xs">
            <FiMapPin size={10} /> {location.name}
          </p>
        )}
      </div>

      {/* ── Actions ───────────────────────────── */}
      <div className="memory-card__actions">
        <button
          className="memory-card__action-btn"
          onClick={() => navigate(`/memory/${_id}`)}
          title="View"
        >
          <FiEye size={15} />
        </button>
        <button
          className="memory-card__action-btn"
          onClick={handleEdit}
          title="Edit"
        >
          <FiEdit2 size={15} />
        </button>
        <button
          className="memory-card__action-btn memory-card__action-btn--danger"
          onClick={handleDelete}
          title="Delete"
          disabled={deleting}
        >
          <FiTrash2 size={15} />
        </button>
      </div>
    </article>
  );
}
