/**
 * SearchBar Component
 * Keyword input + mood filter + date range with autocomplete suggestions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiSliders } from 'react-icons/fi';
import { getSearchSuggestions } from '../api/memoryApi';
import './SearchBar.css';

const MOODS = ['all','happy','sad','excited','nostalgic','grateful','anxious','peaceful','angry','neutral'];
const MOOD_EMOJI = {
  all:'🌐', happy:'😊', sad:'😢', excited:'🎉', nostalgic:'🌅',
  grateful:'🙏', anxious:'😰', peaceful:'🕊️', angry:'😡', neutral:'😐',
};

export default function SearchBar({ onSearch, initialValues = {}, compact = false }) {
  const navigate = useNavigate();
  const [query,       setQuery]       = useState(initialValues.q || '');
  const [mood,        setMood]        = useState(initialValues.mood || 'all');
  const [startDate,   setStartDate]   = useState(initialValues.startDate || '');
  const [endDate,     setEndDate]     = useState(initialValues.endDate || '');
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const [sugLoading,  setSugLoading]  = useState(false);
  const sugTimerRef   = useRef(null);
  const inputRef      = useRef(null);

  // Debounced autocomplete
  useEffect(() => {
    clearTimeout(sugTimerRef.current);
    if (query.trim().length < 2) { setSuggestions([]); return; }
    sugTimerRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const data = await getSearchSuggestions(query.trim());
        setSuggestions(data.suggestions || []);
      } catch { setSuggestions([]); }
      finally { setSugLoading(false); }
    }, 350);
    return () => clearTimeout(sugTimerRef.current);
  }, [query]);

  const buildParams = useCallback(() => ({
    q: query.trim() || undefined,
    mood: mood !== 'all' ? mood : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [query, mood, startDate, endDate]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    setShowSug(false);
    const params = buildParams();
    if (onSearch) {
      onSearch(params);
    } else {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
      ).toString();
      navigate(`/search?${qs}`);
    }
  };

  const handleSuggestionClick = (title) => {
    setQuery(title);
    setShowSug(false);
    setTimeout(() => handleSubmit(), 50);
  };

  const clearQuery = () => { setQuery(''); setSuggestions([]); inputRef.current?.focus(); };
  const clearAll   = () => { setQuery(''); setMood('all'); setStartDate(''); setEndDate(''); setSuggestions([]); onSearch?.({});};

  return (
    <div className={`sb-wrap ${compact ? 'sb-wrap--compact' : ''}`}>
      <form className="sb-form" onSubmit={handleSubmit} role="search">
        {/* Search input */}
        <div className="sb-input-wrap">
          <FiSearch className="sb-search-icon" />
          <input
            ref={inputRef}
            id="search-input"
            type="text"
            className="sb-input"
            placeholder="Search memories by title, description, or tags…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSug(true); }}
            onFocus={() => suggestions.length > 0 && setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 200)}
            autoComplete="off"
            aria-label="Search memories"
          />
          {query && (
            <button type="button" className="sb-clear-btn" onClick={clearQuery} aria-label="Clear search">
              <FiX size={16} />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showSug && (suggestions.length > 0 || sugLoading) && (
            <div className="sb-suggestions" role="listbox">
              {sugLoading && <div className="sb-sug-item sb-sug-loading">Searching…</div>}
              {!sugLoading && suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="sb-sug-item"
                  onMouseDown={() => handleSuggestionClick(s.title)}
                  role="option"
                >
                  <FiSearch size={13} /> {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mood quick-filter pills */}
        {!compact && (
          <div className="sb-moods" role="group" aria-label="Mood filter">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                className={`sb-mood-pill ${mood === m ? 'sb-mood-pill--active' : ''}`}
                onClick={() => setMood(m)}
                aria-pressed={mood === m}
              >
                <span>{MOOD_EMOJI[m]}</span>
                <span className="sb-mood-label">{m}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="sb-actions">
          <button type="submit" className="btn btn-primary sb-search-btn">
            <FiSearch /> Search
          </button>
          <button
            type="button"
            className={`btn btn-secondary sb-filter-btn ${showFilters ? 'sb-filter-btn--active' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <FiSliders /> Filters
            {(startDate || endDate) && <span className="sb-filter-dot" />}
          </button>
          {(query || mood !== 'all' || startDate || endDate) && (
            <button type="button" className="btn btn-ghost sb-clear-all" onClick={clearAll}>
              <FiX size={14} /> Clear all
            </button>
          )}
        </div>

        {/* Extended filters panel */}
        {showFilters && (
          <div className="sb-filters-panel animate-fade-in">
            <div className="sb-filter-group">
              <label htmlFor="sb-start" className="form-label">From Date</label>
              <input
                id="sb-start"
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
              />
            </div>
            <div className="sb-filter-group">
              <label htmlFor="sb-end" className="form-label">To Date</label>
              <input
                id="sb-end"
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
            {compact && (
              <div className="sb-filter-group">
                <label htmlFor="sb-mood" className="form-label">Mood</label>
                <select
                  id="sb-mood"
                  className="form-control"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                >
                  {MOODS.map((m) => (
                    <option key={m} value={m}>{MOOD_EMOJI[m]} {m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
