import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Browse.css';
import PaperCard from '../components/PaperCard';
import CustomSelect from '../components/CustomSelect';

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

  const [filters, setFilters] = useState({ q: initialQ, subject: '', year: '', semester: '' });

  useEffect(() => {
    supabase.from('subjects').select('id, name').order('name').then(({ data }) => setSubjects(data ?? []));
    supabase.from('papers').select('year').eq('status', 'approved').then(({ data }) => {
      if (data) setYears([...new Set(data.map(p => p.year))].sort((a, b) => b - a));
    });
  }, []);

  const fetchPapers = useCallback(async (currentFilters, currentOffset, append = false) => {
    setLoading(true);
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

    const { data } = await q;
    const results = data ?? [];
    setPapers(prev => append ? [...prev, ...results] : results);
    setHasMore(results.length === PAGE_SIZE);
    setLoading(false);
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchPapers(filters, 0, false);
  }, [filters, fetchPapers]);

  function set(key) { return e => setFilters(f => ({ ...f, [key]: e.target.value })); }

  function loadMore() {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchPapers(filters, newOffset, true);
  }

  return (
    <div className="page-content">
      <div className="topbar">
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>Browse Papers</span>
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

        {loading && papers.length === 0 ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : papers.length === 0 ? (
          <div className="empty-state">No papers found. Try adjusting filters.</div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
