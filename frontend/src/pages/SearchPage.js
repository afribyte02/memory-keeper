/**
 * Search Page
 * Full-featured search with keyword, mood, date, and tag filters
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiSearch, FiTag } from 'react-icons/fi';
import { searchMemories, getUserTags } from '../api/memoryApi';
import SearchBar from '../components/SearchBar';
import MemoryCard from '../components/MemoryCard';
import LoadingSpinner from '../components/LoadingSpinner';
import './SearchPage.css';

export default function SearchPage() {
  const navigate       = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [memories,   setMemories]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);
  const [tags,       setTags]       = useState([]);
  const [activeQuery,setActiveQuery]= useState({});

  // Read initial query from URL params
  const initialValues = {
    q:         searchParams.get('q')         || '',
    mood:      searchParams.get('mood')      || 'all',
    startDate: searchParams.get('startDate') || '',
    endDate:   searchParams.get('endDate')   || '',
  };

  // ── Fetch tags for quick-filter sidebar ─────────────────────
  useEffect(() => {
    getUserTags()
      .then((data) => setTags(data.tags || []))
      .catch(() => {});
  }, []);

  // ── Run search from URL on initial load ──────────────────────
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      const params = {
        q: q || undefined,
        mood: searchParams.get('mood') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
      };
      handleSearch(params, true);
    }
  }, []); // eslint-disable-line

  // ── Main search handler ──────────────────────────────────────
  const handleSearch = useCallback(async (params, reset = true) => {
    const currentPage = reset ? 1 : page;
    if (reset) { setPage(1); setMemories([]); }

    // Update URL
    const urlParams = {};
    if (params.q) urlParams.q = params.q;
    if (params.mood && params.mood !== 'all') urlParams.mood = params.mood;
    if (params.startDate) urlParams.startDate = params.startDate;
    if (params.endDate)   urlParams.endDate   = params.endDate;
    setSearchParams(urlParams);
    setActiveQuery(params);

    setLoading(true);
    setSearched(true);
    try {
      const data = await searchMemories({ ...params, page: currentPage, limit: 12 });
      if (reset) {
        setMemories(data.memories);
      } else {
        setMemories((prev) => [...prev, ...data.memories]);
      }
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Search failed: ' + err.message);
    } finally { setLoading(false); }
  }, [page, setSearchParams]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    handleSearch({ ...activeQuery, page: nextPage }, false);
  };

  const handleDelete = (id) => setMemories((prev) => prev.filter((m) => m._id !== id));

  const handleTagClick = (tag) => {
    handleSearch({ tags: tag }, true);
  };

  return (
    <div className="search-page container animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="search-page__header">
        <h1 className="heading-1">
          <FiSearch /> Search Memories
        </h1>
        <p className="text-muted text-sm">
          Find any memory using keywords, mood, date range, or tags
        </p>
      </div>

      <div className="search-page__layout">
        {/* ── Main Column ───────────────────────────────────── */}
        <div className="search-page__main">
          {/* SearchBar */}
          <SearchBar
            onSearch={(params) => handleSearch(params, true)}
            initialValues={initialValues}
          />

          {/* Results */}
          <div className="search-results">
            {loading && memories.length === 0 ? (
              <div className="search-results__loading">
                <LoadingSpinner size="md" />
                <p className="text-muted text-sm">Searching your vault…</p>
              </div>
            ) : searched && memories.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h2 className="heading-3">No memories found</h2>
                <p className="text-muted text-sm">
                  Try different keywords, adjust the mood filter, or broaden your date range.
                </p>
              </div>
            ) : memories.length > 0 ? (
              <>
                {/* Result summary */}
                <div className="search-results__summary">
                  <p className="text-sm text-muted">
                    Found <strong>{pagination.total}</strong> memoir{pagination.total !== 1 ? 'ies' : 'y'}
                    {activeQuery.q && <> matching "<strong>{activeQuery.q}</strong>"</>}
                    {activeQuery.mood && activeQuery.mood !== 'all' && <> · Mood: <strong>{activeQuery.mood}</strong></>}
                  </p>
                </div>

                {/* Grid */}
                <div className="memories-grid stagger-children">
                  {memories.map((memory) => (
                    <MemoryCard key={memory._id} memory={memory} onDelete={handleDelete} />
                  ))}
                </div>

                {/* Load more */}
                {pagination.hasNextPage && (
                  <div className="search-results__load-more">
                    <button className="btn btn-secondary" onClick={loadMore} disabled={loading}>
                      {loading ? <span className="spinner spinner-sm" /> : 'Load More Results'}
                    </button>
                  </div>
                )}
              </>
            ) : !searched ? (
              <div className="search-page__initial-state">
                <div className="empty-state-icon">🧠</div>
                <h2 className="heading-3">Start searching</h2>
                <p className="text-muted text-sm">
                  Type a keyword, select a mood, or pick a date range above to find your memories.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────── */}
        {tags.length > 0 && (
          <aside className="search-sidebar">
            <div className="search-sidebar__card glass-card">
              <h3 className="search-sidebar__title">
                <FiTag size={14} /> Your Tags
              </h3>
              <div className="search-sidebar__tags">
                {tags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    className="search-sidebar__tag"
                    onClick={() => handleTagClick(tag)}
                    title={`Search for #${tag} (${count})`}
                  >
                    <span>#{tag}</span>
                    <span className="search-sidebar__tag-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
