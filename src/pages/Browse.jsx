import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { CONTENT_SWAP, EASE_OUT } from '../lib/motion';
import { supabase } from '../lib/supabase';
import { escapeLike } from '../lib/query';
import { cachedSafeQuery, peek } from '../lib/cache';
import { usePageMeta } from '../lib/usePageMeta';
import { useToast } from '../context/ToastContext';
import './Browse.css';
import PaperCard from '../components/PaperCard';
import CustomSelect from '../components/CustomSelect';
import { SkeletonCardGrid } from '../components/Skeleton';

const SORTS = {
  newest: { label: 'Newest first', column: 'uploaded_at', ascending: false },
  oldest: { label: 'Oldest first', column: 'uploaded_at', ascending: true },
  year:   { label: 'Year (high to low)', column: 'year', ascending: false },
  title:  { label: 'Title (A–Z)', column: 'title', ascending: true },
};

const PAGE_SIZE = 20;

export default function Browse() {
  // Every filter is mirrored in the URL, so Back, refresh and shared links keep them.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [papers,   setPapers]   = useState([]);
  const [subjects, setSubjects] = useState(peek('browse:subjects') ?? []);
  const [years,    setYears]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [hasMore,  setHasMore]  = useState(false);
  const [total,    setTotal]    = useState(null);

  // `refreshing` drives the immediate dim on the existing results the moment a
  // filter changes — without it the page looks frozen until the request lands.
  const [refreshing, setRefreshing] = useState(false);
  // Bumped only when a non-append fetch resolves, so the results block remounts
  // (and its cards re-stagger) exactly once per new result set.
  const [resultsToken, setResultsToken] = useState(0);
  // Guards against out-of-order responses: rapid filter changes fire overlapping
  // requests, and without this a slow earlier one can overwrite a fast later one.
  const requestId = useRef(0);
  // Latest subject list for the fetch callback, which must not re-create on every load.
  const subjectsRef = useRef(peek('browse:subjects') ?? []);

  const [filters, setFilters] = useState({
    q:        initialQ,
    subject:  searchParams.get('subject')  || '',
    year:     searchParams.get('year')     || '',
    semester: searchParams.get('semester') || '',
    type:     searchParams.get('type')     || '',
    sort:     searchParams.get('sort')     || 'newest',
  });
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const { addToast } = useToast();
  usePageMeta('Browse Papers', 'Search and filter the full library of approved past exam papers by subject, year, and semester.');

  // Debounce the title query so we don't fire a Supabase request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => {
    const onError = msg => addToast(msg, 'error');
    // Lookups are read-mostly — cached, but a failed request is never stored.
    cachedSafeQuery('browse:subjects', () => supabase.from('subjects').select('id, name').order('name'),
      { fallback: [], onError, label: 'subjects', ttl: 300_000 }).then(s => { subjectsRef.current = s; setSubjects(s); });
    cachedSafeQuery('browse:years', () => supabase.rpc('paper_years'),
      { fallback: [], onError, label: 'years', ttl: 300_000 })
      .then(data => setYears(data.map(r => r.year)));
  }, [addToast]);

  const fetchPapers = useCallback(async (currentFilters, currentOffset, append = false) => {
    const id = ++requestId.current;
    setLoading(true);
    if (!append) setRefreshing(true);

    let q = supabase
      .from('papers')
      .select('*, subjects(name), teachers(name), profiles!papers_uploader_id_fkey(full_name)', { count: 'exact' })
      .eq('status', 'approved')
      .order(SORTS[currentFilters.sort]?.column ?? 'uploaded_at', { ascending: SORTS[currentFilters.sort]?.ascending ?? false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (currentFilters.q) {
      // Titles usually contain the subject, but match the subject name too so
      // "calculus" finds papers whose title was edited. Quoted so commas and
      // parentheses in the query can't break the `or` filter syntax.
      const needle = currentFilters.q.toLowerCase();
      const subjectIds = subjectsRef.current.filter(s => s.name.toLowerCase().includes(needle)).map(s => s.id);
      const pattern = `"%${escapeLike(currentFilters.q).replace(/[\\"]/g, '\\$&')}%"`;
      q = q.or([`title.ilike.${pattern}`, subjectIds.length ? `subject_id.in.(${subjectIds.join(',')})` : null].filter(Boolean).join(','));
    }
    if (currentFilters.subject)  q = q.eq('subject_id', currentFilters.subject);
    if (currentFilters.year)     q = q.eq('year', Number(currentFilters.year));
    if (currentFilters.semester) q = q.eq('semester', currentFilters.semester);
    if (currentFilters.type)     q = q.eq('exam_type', currentFilters.type);

    let results;
    try {
      const { data, count, error } = await q;
      if (error) throw new Error(`Failed to load papers: ${error.message}`);
      results = data ?? [];
      if (!append) setTotal(count ?? results.length);
    } catch (err) {
      if (id !== requestId.current) return false;
      addToast(err.message || 'Failed to load papers.', 'error');
      setLoading(false);
      setRefreshing(false);
      // Keep the list and the Load More button so the user can retry; only a
      // successful empty page means the end of the results.
      return false;
    }

    // A newer request has since been fired — discard this stale response whole.
    if (id !== requestId.current) return false;

    setPapers(prev => append ? [...prev, ...results] : results);
    setHasMore(results.length === PAGE_SIZE);
    setLoading(false);
    setRefreshing(false);
    if (!append) setResultsToken(t => t + 1);
    return true;
  }, [addToast]);

  useEffect(() => {
    const effectiveFilters = { ...filters, q: debouncedQ };
    // fetchPapers sets loading state first; deferring it a microtask keeps the effect
    // itself free of synchronous setState while still dimming on the same frame.
    queueMicrotask(() => fetchPapers(effectiveFilters, 0, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filters.subject, filters.year, filters.semester, filters.type, filters.sort, fetchPapers]);

  useEffect(() => {
    // Update only the keys Browse owns; any other query params survive.
    const owned = { q: debouncedQ, subject: filters.subject, year: filters.year ? String(filters.year) : '', semester: filters.semester, type: filters.type, sort: filters.sort === 'newest' ? '' : filters.sort };
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(owned)) { if (v) next.set(k, v); else next.delete(k); }
      return next;
    }, { replace: true });
  }, [debouncedQ, filters.subject, filters.year, filters.semester, filters.type, filters.sort, setSearchParams]);

  const hasFilters = !!(filters.q || filters.subject || filters.year || filters.semester || filters.type);
  function clearFilters() { setFilters(f => ({ q: '', subject: '', year: '', semester: '', type: '', sort: f.sort })); }

  function set(key) { return e => setFilters(f => ({ ...f, [key]: e.target.value })); }

  function loadMore() {
    // The next page starts after the rows already shown; no separate offset to reset on filter change.
    fetchPapers({ ...filters, q: debouncedQ }, papers.length, true);
  }

  return (
    <div className="page-content">
      <div className="topbar">
        <div className="browse-topbar-spacer">
          <span className="browse-title">Browse Papers</span>
        </div>
      </div>

      <div className="page-inner">
        <div className="filters-bar">
          {/* Row 1: search (full width) */}
          <div className="filters-search-row">
            <div className="search-wrapper">
              <span className="search-icon"><Search size={14} /></span>
              <input
                className="search-input"
                value={filters.q}
                onChange={set('q')}
                placeholder="Search by title…"
                aria-label="Search papers by title"
              />
            </div>
          </div>

          {/* Row 2: three dropdowns side by side */}
          <div className="filters-dropdowns-row">
            <CustomSelect
              value={filters.subject}
              onChange={v => setFilters(f => ({ ...f, subject: v }))}
              placeholder="All Subjects"
              ariaLabel="Filter by subject"
              searchable
              options={[{ value: '', label: 'All Subjects' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]}
            />
            <CustomSelect
              value={filters.year}
              onChange={v => setFilters(f => ({ ...f, year: v }))}
              placeholder="All Years"
              ariaLabel="Filter by year"
              options={[{ value: '', label: 'All Years' }, ...years.map(y => ({ value: y, label: String(y) }))]}
            />
            <CustomSelect
              value={filters.semester}
              onChange={v => setFilters(f => ({ ...f, semester: v }))}
              placeholder="All Semesters"
              ariaLabel="Filter by semester"
              options={[
                { value: '', label: 'All Semesters' },
                { value: 'Spring', label: 'Spring' },
                { value: 'Summer', label: 'Summer' },
                { value: 'Fall',   label: 'Fall'   },
              ]}
            />
            <CustomSelect
              value={filters.type}
              onChange={v => setFilters(f => ({ ...f, type: v }))}
              placeholder="Mid & Final"
              ariaLabel="Filter by exam type"
              options={[
                { value: '',      label: 'Mid & Final' },
                { value: 'Mid',   label: 'Mid only'    },
                { value: 'Final', label: 'Final only'  },
              ]}
            />
            <CustomSelect
              value={filters.sort}
              onChange={v => setFilters(f => ({ ...f, sort: v || 'newest' }))}
              placeholder="Newest first"
              ariaLabel="Sort papers"
              options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))}
            />
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm filters-clear" onClick={clearFilters}>Clear</button>
            )}
          </div>
        </div>

        {/* Dimmed the instant a filter changes, so the click registers visually
            long before the query comes back. */}
        {total !== null && !(loading && papers.length === 0) && (
          <div className="results-count" aria-live="polite">{total} {total === 1 ? 'paper' : 'papers'}</div>
        )}

        <div className={`results-region${refreshing && papers.length > 0 ? ' is-refreshing' : ''}`}>
          <div className="swap-stack">
          <AnimatePresence initial={false}>
            {loading && papers.length === 0 ? (
              <motion.div key="skeleton" {...CONTENT_SWAP} exit={{ opacity: 0, transition: { duration: 0.24, ease: EASE_OUT } }}>
                <SkeletonCardGrid count={12} />
              </motion.div>
            ) : papers.length === 0 ? (
              <motion.div key={`empty-${resultsToken}`} {...CONTENT_SWAP} className="empty-state">
                No papers found. Try adjusting filters.
              </motion.div>
            ) : (
              // Keyed on the token so appending via Load More extends the existing
              // grid in place instead of remounting everything.
              <motion.div key={`grid-${resultsToken}`} {...CONTENT_SWAP} initial={{ opacity: 1 }}>
                <div className="papers-grid papers-grid-inner">
                  {papers.map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}
                </div>
                {hasMore && (
                  <div className="load-more-wrap">
                    <button className="btn btn-ghost" onClick={loadMore} disabled={loading}>
                      {loading ? 'Loading…' : 'Load More'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
