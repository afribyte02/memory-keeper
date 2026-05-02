/**
 * Upload Memory Page
 * Create new memory OR edit existing one (if ?edit=id is in URL)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { FiSave, FiArrowLeft, FiX, FiMapPin } from 'react-icons/fi';
import { createMemory, updateMemory, getMemory } from '../api/memoryApi';
import MediaUploader from '../components/MediaUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import './UploadMemory.css';

const MOODS = ['happy','sad','excited','nostalgic','grateful','anxious','peaceful','angry','neutral'];
const MOOD_EMOJI = {
  happy:'😊', sad:'😢', excited:'🎉', nostalgic:'🌅',
  grateful:'🙏', anxious:'😰', peaceful:'🕊️', angry:'😡', neutral:'😐',
};

export default function UploadMemory() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const editId        = searchParams.get('edit');
  const isEdit        = !!editId;

  const [title,       setTitle]       = useState('');
  const [description, setDesc]        = useState('');
  const [mood,        setMood]        = useState('neutral');
  const [date,        setDate]        = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tags,        setTags]        = useState('');
  const [location,    setLocation]    = useState('');
  const [isPrivate,   setIsPrivate]   = useState(true);
  const [media,       setMedia]       = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false); // media upload in progress
  const [fetching,    setFetching]    = useState(isEdit);
  const [charCount,   setCharCount]   = useState(0);

  // ── Load existing memory for edit ───────────────────────────
  useEffect(() => {
    if (!editId) return;
    setFetching(true);
    getMemory(editId)
      .then(({ memory: m }) => {
        setTitle(m.title || '');
        setDesc(m.description || '');
        setMood(m.mood || 'neutral');
        setDate(m.date ? format(new Date(m.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setTags(m.tags?.join(', ') || '');
        setLocation(m.location?.name || '');
        setIsPrivate(m.isPrivate !== undefined ? m.isPrivate : true);
        setMedia(m.media || []);
        setCharCount(m.description?.length || 0);
      })
      .catch(() => toast.error('Could not load memory for editing'))
      .finally(() => setFetching(false));
  }, [editId]);

  const handleDescChange = (e) => {
    setDesc(e.target.value);
    setCharCount(e.target.value.length);
  };

  const parseTags = (raw) =>
    raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Please add a title for this memory'); return; }
    if (!date)         { toast.error('Please select a date'); return; }

    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      mood,
      date: new Date(date).toISOString(),
      media,
      tags: parseTags(tags),
      location: { name: location.trim(), coordinates: { lat: null, lng: null } },
      isPrivate,
    };

    try {
      if (isEdit) {
        await updateMemory(editId, payload);
        toast.success('Memory updated! ✨');
      } else {
        const { memory } = await createMemory(payload);
        toast.success('Memory saved! 🧠');
        navigate(`/memory/${memory._id}`);
        return;
      }
      navigate(`/memory/${editId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to save memory');
    } finally { setSaving(false); }
  };

  if (fetching) return <LoadingSpinner fullPage text="Loading memory…" />;

  return (
    <div className="upload-page container">
      {/* Header */}
      <div className="upload-page__header animate-fade-in">
        <button className="btn btn-ghost upload-page__back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <div>
          <h1 className="heading-1">{isEdit ? '✏️ Edit Memory' : '🧠 New Memory'}</h1>
          <p className="text-muted text-sm">
            {isEdit ? 'Update your memory details' : 'Capture a moment worth remembering'}
          </p>
        </div>
      </div>

      <form className="upload-form animate-fade-in" onSubmit={handleSubmit}>
        <div className="upload-form__main">
          {/* ── Left Column ───────────────────────────────── */}
          <div className="upload-form__col">

            {/* Title */}
            <div className="form-group">
              <label htmlFor="memory-title" className="form-label">Memory Title *</label>
              <input
                id="memory-title"
                type="text"
                className="form-control upload-title-input"
                placeholder="Give this memory a meaningful name…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <div className="upload-label-row">
                <label htmlFor="memory-desc" className="form-label">Description</label>
                <span className={`upload-char-count text-xs ${charCount > 4800 ? 'upload-char-count--warn' : 'text-muted'}`}>
                  {charCount}/5000
                </span>
              </div>
              <textarea
                id="memory-desc"
                className="form-control"
                placeholder="Tell the story behind this memory. What were you feeling? Who was there? What made it special?"
                value={description}
                onChange={handleDescChange}
                maxLength={5000}
                rows={6}
              />
            </div>

            {/* Date */}
            <div className="form-group">
              <label htmlFor="memory-date" className="form-label">Memory Date *</label>
              <input
                id="memory-date"
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>

            {/* Tags */}
            <div className="form-group">
              <label htmlFor="memory-tags" className="form-label">Tags</label>
              <input
                id="memory-tags"
                type="text"
                className="form-control"
                placeholder="family, vacation, birthday (comma-separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              {/* Tag preview */}
              {tags && (
                <div className="upload-tag-preview">
                  {parseTags(tags).slice(0, 10).map((t) => (
                    <span key={t} className="upload-tag">#{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="form-group">
              <label htmlFor="memory-location" className="form-label">
                <FiMapPin size={12} style={{ marginRight: 4 }} />Location
              </label>
              <input
                id="memory-location"
                type="text"
                className="form-control"
                placeholder="e.g. Paris, France or Home"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* ── Right Column ──────────────────────────────── */}
          <div className="upload-form__col">

            {/* Mood Picker */}
            <div className="form-group">
              <label className="form-label">How did this memory feel?</label>
              <div className="upload-mood-grid">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`upload-mood-btn ${mood === m ? `upload-mood-btn--active mood-${m}` : ''}`}
                    onClick={() => setMood(m)}
                    aria-pressed={mood === m}
                    title={m}
                  >
                    <span className="upload-mood-emoji">{MOOD_EMOJI[m]}</span>
                    <span className="upload-mood-label">{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy toggle */}
            <div className="form-group">
              <label className="form-label">Privacy</label>
              <div className="upload-privacy-wrap">
                <button
                  type="button"
                  className={`upload-privacy-btn ${isPrivate ? 'upload-privacy-btn--active' : ''}`}
                  onClick={() => setIsPrivate(true)}
                >
                  🔒 Private
                </button>
                <button
                  type="button"
                  className={`upload-privacy-btn ${!isPrivate ? 'upload-privacy-btn--active' : ''}`}
                  onClick={() => setIsPrivate(false)}
                >
                  🌍 Public
                </button>
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                {isPrivate ? 'Only you can see this memory.' : 'This memory is visible to others.'}
              </p>
            </div>

            {/* Media Uploader */}
            <div className="form-group">
              <label className="form-label">Attach Media</label>
              {uploading && (
                <p className="text-xs" style={{ color: 'var(--warning)', marginBottom: 8 }}>
                  ⏳ Upload in progress… please wait before saving.
                </p>
              )}
              <MediaUploader
                onMediaChange={setMedia}
                existingMedia={media}
                onUploadingChange={setUploading}
              />
            </div>
          </div>
        </div>

        {/* ── Submit Bar ────────────────────────────────────── */}
        <div className="upload-form__footer">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={saving}>
            <FiX /> Cancel
          </button>
          <button id="btn-save-memory" type="submit" className="btn btn-primary" disabled={saving || uploading}>
            {saving
              ? <><span className="spinner spinner-sm" /> Saving…</>
              : uploading
              ? <><span className="spinner spinner-sm" /> Uploading media…</>
              : <><FiSave /> {isEdit ? 'Update Memory' : 'Save Memory'}</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
