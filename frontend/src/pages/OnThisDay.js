/**
 * On This Day Page
 * Shows memories from the same day in previous years
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { FiCalendar, FiClock, FiArrowRight } from 'react-icons/fi';
import { getOnThisDay } from '../api/memoryApi';
import LoadingSpinner from '../components/LoadingSpinner';
import './OnThisDay.css';

const MOOD_EMOJI = {
  happy:'😊', sad:'😢', excited:'🎉', nostalgic:'🌅',
  grateful:'🙏', anxious:'😰', peaceful:'🕊️', angry:'😡', neutral:'😐',
};

export default function OnThisDay() {
  const navigate          = useNavigate();
  const [memories, setMemories] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const today = new Date();

  useEffect(() => {
    setLoading(true);
    getOnThisDay()
      .then((data) => setMemories(data.memories || []))
      .catch(() => toast.error('Failed to load On This Day'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage text="Traveling back in time…" />;

  return (
    <div className="otd-page container animate-fade-in">
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="otd-hero glass-card">
        <div className="otd-hero__calendar">
          <div className="otd-hero__month">
            {format(today, 'MMMM')}
          </div>
          <div className="otd-hero__day">
            {format(today, 'd')}
          </div>
        </div>
        <div className="otd-hero__text">
          <h1 className="otd-hero__title heading-1">
            <FiCalendar /> On This Day
          </h1>
          <p className="text-muted">
            A look back at your memories from{' '}
            <strong className="text-gradient">
              {format(today, 'MMMM d')}
            </strong>{' '}
            across all your years
          </p>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────── */}
      {memories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <h2 className="heading-3">No memories on this day yet</h2>
          <p className="text-muted text-sm">
            Once you have memories from previous years, they'll appear here.<br />
            Keep building your vault!
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            Add a Memory Today
          </button>
        </div>
      ) : (
        <>
          <p className="otd-count text-muted">
            You have <strong>{memories.length} memory{memories.length !== 1 ? ' entries' : ''}</strong> on this date across your history
          </p>

          {/* Timeline */}
          <div className="otd-timeline">
            {memories.map((m, i) => (
              <div
                key={m._id}
                className="otd-entry animate-fade-in"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Year marker */}
                <div className="otd-entry__year-col">
                  <div className="otd-year-badge">
                    <FiClock size={12} />
                    {new Date(m.date).getFullYear()}
                  </div>
                  <div className="otd-years-ago text-xs text-muted">
                    {m.yearsAgo === 1 ? '1 year ago' : `${m.yearsAgo} years ago`}
                  </div>
                  {i < memories.length - 1 && <div className="otd-line" />}
                </div>

                {/* Memory card */}
                <div
                  className="otd-entry__card card"
                  onClick={() => navigate(`/memory/${m._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/memory/${m._id}`)}
                >
                  {/* Thumbnail if available */}
                  {m.media?.find((med) => med.type === 'image') && (
                    <div className="otd-entry__thumb">
                      <img
                        src={m.media.find((med) => med.type === 'image').url}
                        alt={m.title}
                        className="otd-entry__thumb-img"
                      />
                    </div>
                  )}

                  <div className="otd-entry__body">
                    <div className="otd-entry__top">
                      <span className={`badge badge-mood mood-${m.mood}`}>
                        {MOOD_EMOJI[m.mood]} {m.mood}
                      </span>
                      <span className="text-xs text-muted">
                        {format(new Date(m.date), 'MMMM d, yyyy')}
                      </span>
                    </div>

                    <h3 className="otd-entry__title">{m.title}</h3>

                    {m.description && (
                      <p className="otd-entry__desc text-sm text-muted">
                        {m.description.length > 120 ? m.description.slice(0, 120) + '…' : m.description}
                      </p>
                    )}

                    {m.tags?.length > 0 && (
                      <div className="otd-entry__tags">
                        {m.tags.slice(0, 4).map((t) => (
                          <span key={t} className="detail-tag">#{t}</span>
                        ))}
                      </div>
                    )}

                    <div className="otd-entry__footer">
                      <span className="otd-entry__media-count text-xs text-muted">
                        {m.media?.length || 0} media file{m.media?.length !== 1 ? 's' : ''}
                      </span>
                      <span className="otd-entry__view-link">
                        View memory <FiArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
