import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { CONTENT_SWAP } from '../lib/motion';
import { supabase } from '../lib/supabase';
import { safeQuery } from '../lib/query';
import { cachedQuery } from '../lib/cache';
import { usePageMeta } from '../lib/usePageMeta';
import { useToast } from '../context/ToastContext';
import './Home.css';
import PaperCard from '../components/PaperCard';
import { SkeletonCardGrid } from '../components/Skeleton';

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

function StatCard({ label, value, sub, color, suffix = '' }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : {}}>
        {typeof value === 'number' ? animated + suffix : value}
      </div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

export default function Home() {
  const [papers, setPapers]   = useState([]);
  const [stats, setStats]     = useState({ total: 0, approved: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();
  usePageMeta('Home', 'Browse, search, and download approved past exam papers, or upload your own to help other students.');

  useEffect(() => {
    const onError = msg => addToast(msg, 'error');
    Promise.all([
      cachedQuery('home:recent', () => safeQuery(
        supabase
          .from('papers')
          .select('*, subjects(name), profiles!papers_uploader_id_fkey(full_name)')
          .eq('status', 'approved')
          .order('uploaded_at', { ascending: false })
          .limit(12),
        { fallback: [], onError, label: 'recent papers' },
      ), { ttl: 30_000 }),
      cachedQuery('home:stats', () =>
        safeQuery(supabase.from('papers').select('id, status'), { fallback: [], onError, label: 'stats' }),
        { ttl: 30_000 }),
    ]).then(([p, all]) => {
      setPapers(p);
      setStats({
        total:    all.length,
        approved: all.filter(x => x.status === 'approved').length,
        pending:  all.filter(x => x.status === 'pending').length,
      });
      setLoading(false);
    });
  }, [addToast]);

  const rate = stats.total === 0 ? 0 : Math.round((stats.approved / stats.total) * 100);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
    else navigate('/browse');
  }

  return (
    <div className="page-content">
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
        <StatCard label="Total Papers"  value={loading ? '—' : stats.approved + stats.pending} sub="in the vault"     />
        <StatCard label="Approved"      value={loading ? '—' : stats.approved}  sub="publicly visible"  color="var(--status-approved)" />
        <StatCard label="Pending"       value={loading ? '—' : stats.pending}   sub="awaiting review"   color="var(--status-pending)" />
        <StatCard label="Success Rate"  value={loading ? '—' : rate}            sub="approval rate"     suffix="%" />
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

        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div key="skeleton" {...CONTENT_SWAP}>
              <SkeletonCardGrid count={8} />
            </motion.div>
          ) : papers.length === 0 ? (
            <motion.div key="empty" {...CONTENT_SWAP} className="empty-state">
              No papers yet.{' '}
              <Link to="/upload" style={{ color: 'var(--accent-blue)' }}>Be the first to upload!</Link>
            </motion.div>
          ) : (
            <motion.div key="grid" {...CONTENT_SWAP} className="papers-grid papers-grid-inner">
              {papers.map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
