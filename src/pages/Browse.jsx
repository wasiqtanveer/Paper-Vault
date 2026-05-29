import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { CONTENT_SWAP } from '../lib/motion';
import { supabase } from '../lib/supabase';
import { safeQuery } from '../lib/query';
import { cachedQuery } from '../lib/cache';
import { usePageMeta } from '../lib/usePageMeta';
import { useToast } from '../context/ToastContext';
import './Browse.css';
import PaperCard from '../components/PaperCard';
import CustomSelect from '../components/CustomSelect';
import { SkeletonCardGrid } from '../components/Skeleton';

const PAGE_SIZE = 20;

export default function Browse() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [papers,   setPapers]   = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years,    setYears]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [hasMore,  setHasMore]  = useState(false);
  const [offset,   setOffset]   = useState(0);

  // `refreshing` drives the immediate dim on the existing results the moment a
  // filter changes — without it the page looks frozen until the request lands.
  const [refreshing, setRefreshing] = useState(false);
  // Bumped only when a non-append fetch resolves, so the results block remounts
  // (and its cards re-stagger) exactly once per new result set.
  const [resultsToken, setResultsToken] = useState(0);
  // Guards against out-of-order responses: rapid filter changes fire overlapping
  // requests, and without this a slow earlier one can overwrite a fast later one.
  const requestId = useRef(0);

  const [filters, setFilters] = useState({ q: initialQ, subject: '', year: '', semester: '' });
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
    // Lookups are read-mostly — cache them so they don't refetch on every visit.
    cachedQuery('browse:subjects', () =>
      safeQuery(supabase.from('subjects').select('id, name').order('name'), { fallback: [], onError, label: 'subjects' }),
    ).then(setSubjects);
    cachedQuery('browse:years', () =>
      safeQuery(supabase.from('papers').select('year').eq('status', 'approved'), { fallback: [], onError, label: 'years' })
        .then(data => [...new Set(data.map(p => p.year))].sort((a, b) => b - a)),
    ).then(setYears);
  }, [addToast]);

  const fetchPapers = useCallback(async (currentFilters, currentOffset, append = false) => {
    const id = ++requestId.current;
    setLoading(true);
    if (!append) setRefreshing(true);

    let q = supabase
      .from('papers')
      .select('*, subjects(name), profiles!papers_uploader_id_fkey(full_name)')
      .eq('status', 'approved')
      .order('uploaded_at', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (currentFilters.q)        q = q.ilike('title', `%${currentFilters.q}%`);
    if (currentFilters.subject)  q = q.eq('subject_id', currentFilters.subject);
    if (currentFilters.year)     q = q.eq('year', Number(currentFilters.year));
    if (currentFilters.semester) q = q.eq('semester', currentFilters.semester);

    const results = await safeQuery(q, { fallback: [], onError: msg => addToast(msg, 'error'), label: 'papers' });

    // A newer request has since been fired — discard this stale response whole.
    if (id !== requestId.current) return;

    setPapers(prev => append ? [...prev, ...results] : results);
    setHasMore(results.length === PAGE_SIZE);
    setLoading(false);
    setRefreshing(false);
    if (!append) setResultsToken(t => t + 1);
  }, [addToast]);

  useEffect(() => {
    const effectiveFilters = { ...filters, q: debouncedQ };
    setOffset(0);
    fetchPapers(effectiveFilters, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filters.subject, filters.year, filters.semester, fetchPapers]);

  function set(key) { return e => setFilters(f => ({ ...f, [key]: e.target.value })); }

  function loadMore() {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchPapers({ ...filters, q: debouncedQ }, newOffset, true);
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
              />
            </div>
          </div>

          {/* Row 2: three dropdowns side by side */}
          <div className="filters-dropdowns-row">
            <CustomSelect
              value={filters.subject}
              onChange={v => setFilters(f => ({ ...f, subject: v }))}
              placeholder="All Subjects"
              options={[{ value: '', label: 'All Subjects' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]}
            />
            <CustomSelect
              value={filters.year}
              onChange={v => setFilters(f => ({ ...f, year: v }))}
              placeholder="All Years"
              options={[{ value: '', label: 'All Years' }, ...years.map(y => ({ value: y, label: String(y) }))]}
            />
            <CustomSelect
              value={filters.semester}
              onChange={v => setFilters(f => ({ ...f, semester: v }))}
              placeholder="All Semesters"
              options={[
                { value: '', label: 'All Semesters' },
                { value: 'Spring', label: 'Spring' },
                { value: 'Fall',   label: 'Fall'   },
                { value: 'Mid',    label: 'Mid'    },
                { value: 'Final',  label: 'Final'  },
              ]}
            />
          </div>
        </div>

        {/* Dimmed the instant a filter changes, so the click registers visually
            long before the query comes back. */}
        <div className={`results-region${refreshing && papers.length > 0 ? ' is-refreshing' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
            {loading && papers.length === 0 ? (
              <motion.div key="skeleton" {...CONTENT_SWAP}>
                <SkeletonCardGrid count={12} />
              </motion.div>
            ) : papers.length === 0 ? (
              <motion.div key={`empty-${resultsToken}`} {...CONTENT_SWAP} className="empty-state">
                No papers found. Try adjusting filters.
              </motion.div>
            ) : (
              // Keyed on the token so appending via Load More extends the existing
              // grid in place instead of remounting everything.
              <motion.div key={`grid-${resultsToken}`} {...CONTENT_SWAP}>
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
  );
}
