/**
 * MemoryDetail Page
 * Full view of a single memory with media gallery and details
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiMapPin,
  FiCalendar, FiEye, FiImage, FiVideo, FiMic
} from 'react-icons/fi';
import { getMemory, deleteMemory } from '../api/memoryApi';
import LoadingSpinner from '../components/LoadingSpinner';
import './MemoryDetail.css';

const MOOD_EMOJI = {
  happy:'😊', sad:'😢', excited:'🎉', nostalgic:'🌅',
  grateful:'🙏', anxious:'😰', peaceful:'🕊️', angry:'😡', neutral:'😐',
};

export default function MemoryDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [memory,    setMemory]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox,  setLightbox]  = useState(false);

  useEffect(() => {
    setLoading(true);
    getMemory(id)
      .then(({ memory: m }) => { setMemory(m); setActiveIdx(0); })
      .catch(() => toast.error('Memory not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this memory permanently?')) return;
    setDeleting(true);
    try {
      await deleteMemory(id);
      toast.success('Memory deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Loading memory…" />;
  if (!memory) return (
    <div className="container" style={{ paddingTop: '3rem' }}>
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <h2>Memory Not Found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  );

  const { title, description, mood, date, media, tags, location, viewCount, isPrivate, createdAt } = memory;
  const activeMedia = media?.[activeIdx];
  const hasMedia    = media?.length > 0;

  return (
    <div className="detail-page container animate-fade-in">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="detail-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <div className="detail-header__actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/upload?edit=${id}`)}>
            <FiEdit2 /> Edit
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            <FiTrash2 /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="detail-layout">
        {/* ── Media Section ───────────────────────────────── */}
        {hasMedia && (
          <div className="detail-media-section">
            {/* Main media viewer */}
            <div
              className="detail-media-main"
              onClick={() => activeMedia?.type === 'image' && setLightbox(true)}
              style={{ cursor: activeMedia?.type === 'image' ? 'zoom-in' : 'default' }}
            >
              {activeMedia?.type === 'image' && (
                <img src={activeMedia.url} alt={title} className="detail-media-img" />
              )}
              {activeMedia?.type === 'video' && (
                <video src={activeMedia.url} controls className="detail-media-video" />
              )}
              {activeMedia?.type === 'audio' && (
                <div className="detail-media-audio-wrap">
                  <FiMic size={48} className="detail-audio-icon" />
                  <p className="text-muted text-sm">{activeMedia.filename || 'Audio Recording'}</p>
                  <audio src={activeMedia.url} controls className="detail-audio-player" />
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {media.length > 1 && (
              <div className="detail-thumb-strip">
                {media.map((m, i) => (
                  <button
                    key={i}
                    className={`detail-thumb ${activeIdx === i ? 'detail-thumb--active' : ''}`}
                    onClick={() => setActiveIdx(i)}
                    title={m.filename || m.type}
                  >
                    {m.type === 'image' ? (
                      <img src={m.url} alt={`Media ${i + 1}`} />
                    ) : (
                      <div className="detail-thumb-icon">
                        {m.type === 'video' ? <FiVideo /> : <FiMic />}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Info Section ────────────────────────────────── */}
        <div className="detail-info">
          {/* Mood badge */}
          <div className="detail-info__top">
            <span className={`badge badge-mood mood-${mood}`}>
              {MOOD_EMOJI[mood]} {mood}
            </span>
            {isPrivate ? (
              <span className="badge badge-primary">🔒 Private</span>
            ) : (
              <span className="badge badge-primary">🌍 Public</span>
            )}
          </div>

          <h1 className="detail-title">{title}</h1>

          {/* Meta info */}
          <div className="detail-meta">
            <span className="detail-meta-item">
              <FiCalendar size={14} />
              {date ? format(new Date(date), 'MMMM d, yyyy') : ''}
            </span>
            {location?.name && (
              <span className="detail-meta-item">
                <FiMapPin size={14} /> {location.name}
              </span>
            )}
            <span className="detail-meta-item">
              <FiEye size={14} /> {viewCount || 0} views
            </span>
            <span className="detail-meta-item text-muted text-xs">
              Saved {createdAt ? format(new Date(createdAt), 'MMM d, yyyy') : ''}
            </span>
          </div>

          {/* Description */}
          {description && (
            <div className="detail-description">
              <p>{description}</p>
            </div>
          )}

          {/* Tags */}
          {tags?.length > 0 && (
            <div className="detail-tags">
              {tags.map((t) => (
                <span key={t} className="detail-tag">#{t}</span>
              ))}
            </div>
          )}

          {/* Media count */}
          {hasMedia && (
            <div className="detail-media-stats">
              {media.filter((m) => m.type === 'image').length > 0 && (
                <span><FiImage size={13} /> {media.filter((m) => m.type === 'image').length} photo{media.filter((m) => m.type === 'image').length !== 1 ? 's' : ''}</span>
              )}
              {media.filter((m) => m.type === 'video').length > 0 && (
                <span><FiVideo size={13} /> {media.filter((m) => m.type === 'video').length} video{media.filter((m) => m.type === 'video').length !== 1 ? 's' : ''}</span>
              )}
              {media.filter((m) => m.type === 'audio').length > 0 && (
                <span><FiMic size={13} /> {media.filter((m) => m.type === 'audio').length} audio clip{media.filter((m) => m.type === 'audio').length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────── */}
      {lightbox && activeMedia?.type === 'image' && (
        <div className="detail-lightbox" onClick={() => setLightbox(false)}>
          <button className="detail-lightbox__close" onClick={() => setLightbox(false)}>✕</button>
          <img
            src={activeMedia.url}
            alt={title}
            className="detail-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
