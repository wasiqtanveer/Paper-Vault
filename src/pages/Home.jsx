import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Home.css';
import PaperCard from '../components/PaperCard';

export default function Home() {
  const [papers, setPapers]     = useState([]);
  const [stats, setStats]       = useState({ total: 0, approved: 0, pending: 0 });
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      supabase
        .from('papers')
        .select('*, subjects(name), profiles!papers_uploader_id_fkey(full_name)')
        .eq('status', 'approved')
        .order('uploaded_at', { ascending: false })
        .limit(12),
      supabase.from('papers').select('id, status'),
    ]).then(([{ data: p }, { data: all }]) => {
      setPapers(p ?? []);
      const allPapers = all ?? [];
      setStats({
        total:    allPapers.length,
        approved: allPapers.filter(x => x.status === 'approved').length,
        pending:  allPapers.filter(x => x.status === 'pending').length,
      });
      setLoading(false);
    });
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
    else navigate('/browse');
  }

  return (
    <div className="page-content">
      {/* Top bar */}
      <div className="topbar">
        <form className="search-wrapper" onSubmit={handleSearch} style={{ maxWidth: 360 }}>
          <span className="search-icon"><Search size={14} /></span>
          <input
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search papers by title…"
          />
        </form>
        <div className="topbar-actions">
          <Link to="/browse" className="btn btn-ghost">Browse All</Link>
          <Link to="/upload" className="btn btn-primary">+ Upload Paper</Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Papers</div>
          <div className="stat-value">{loading ? '—' : stats.total}</div>
          <div className="stat-sub">in the vault</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--status-approved)' }}>
            {loading ? '—' : stats.approved}
          </div>
          <div className="stat-sub">publicly visible</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: 'var(--status-pending)' }}>
            {loading ? '—' : stats.pending}
          </div>
          <div className="stat-sub">awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Success Rate</div>
          <div className="stat-value">
            {loading || stats.total === 0
              ? '—'
              : `${Math.round((stats.approved / stats.total) * 100)}%`}
          </div>
          <div className="stat-sub">approval rate</div>
        </div>
      </div>

      {/* Grid */}
      <div className="page-inner">
        <div className="page-header">
          <div>
            <div className="page-title">Recently Added</div>
            <div className="page-subtitle">Latest approved papers from the vault</div>
          </div>
          <Link to="/browse" className="btn btn-ghost">View all →</Link>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : papers.length === 0 ? (
          <div className="empty-state">
            No papers yet.{' '}
            <Link to="/upload" style={{ color: 'var(--accent-blue)' }}>Be the first to upload!</Link>
          </div>
        ) : (
          <div className="papers-grid papers-grid-inner">
            {papers.map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
