import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { CONTENT_SWAP, EASE_OUT } from '../lib/motion';
import { supabase } from '../lib/supabase';
import { countRows } from '../lib/query';
import { cachedQuery, cachedSafeQuery, peek } from '../lib/cache';
import { usePageMeta } from '../lib/usePageMeta';
import { useToast } from '../context/useToast';
import './Home.css';
import PaperCard from '../components/PaperCard';
import { SkeletonCardGrid } from '../components/Skeleton';

function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (target === 0) return;
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
  // A zero target renders 0 directly rather than resetting state from the effect.
  return target === 0 ? 0 : val;
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

const RECENT_SELECT = '*, subjects(name), teachers(name), profiles!papers_uploader_id_fkey(full_name)';

const fetchRecent = onError => cachedSafeQuery('home:recent', () =>
  supabase.from('papers').select(RECENT_SELECT)
    .eq('status', 'approved').order('uploaded_at', { ascending: false }).limit(12),
  { fallback: [], onError, label: 'recent papers', ttl: 30_000 });

// Two head-only counts: no rows cross the wire, and a failure throws so it is never cached.
const fetchStats = () => cachedQuery('home:stats', async () => {
  const [approved, pending] = await Promise.all([
    countRows(supabase.from('papers').select('id', { count: 'exact', head: true }).eq('status', 'approved')),
    countRows(supabase.from('papers').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
  ]);
  return { approved, pending };
}, { ttl: 30_000 });

export default function Home() {
  // Seed from the last visit so returning to Home paints instantly; the
  // effect below revalidates in the background.
  const cachedPapers = peek('home:recent');
  const cachedStats  = peek('home:stats');
  const [papers, setPapers]   = useState(cachedPapers ?? []);
  const [stats, setStats]     = useState(cachedStats ?? { approved: 0, pending: 0 });
  const [loading, setLoading] = useState(!cachedPapers);
  const [statsReady, setStatsReady] = useState(!!cachedStats);
  const [query, setQuery]     = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();
  usePageMeta('Home', 'Browse, search, and download approved past exam papers, or upload your own to help other students.');

  useEffect(() => {
    let alive = true;
    // Papers and stats resolve independently, so the grid never waits on the counters.
    fetchRecent(msg => addToast(msg, 'error')).then(p => {
      if (!alive) return;
      setPapers(p);
      setLoading(false);
    });
    fetchStats().then(s => { if (alive) { setStats(s); setStatsReady(true); } }).catch(() => {});
    return () => { alive = false; };
  }, [addToast]);

  const total = stats.approved + stats.pending;
  const rate = total === 0 ? 0 : Math.round((stats.approved / total) * 100);

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
            aria-label="Search papers by title"
          />
        </form>
        <div className="topbar-actions">
          <Link to="/browse" className="btn btn-ghost">Browse All</Link>
          <Link to="/upload" className="btn btn-primary">+ Upload Paper</Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="stats-row">
        <StatCard label="Total Papers"  value={!statsReady ? '—' : stats.approved + stats.pending} sub="in the vault"     />
        <StatCard label="Approved"      value={!statsReady ? '—' : stats.approved}  sub="publicly visible"  color="var(--status-approved)" />
        <StatCard label="Pending"       value={!statsReady ? '—' : stats.pending}   sub="awaiting review"   color="var(--status-pending)" />
        <StatCard label="Success Rate"  value={!statsReady ? '—' : rate}            sub="approval rate"     suffix="%" />
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

        <div className="swap-stack">
        <AnimatePresence initial={false}>
          {loading ? (
            <motion.div key="skeleton" {...CONTENT_SWAP} exit={{ opacity: 0, transition: { duration: 0.24, ease: EASE_OUT } }}>
              <SkeletonCardGrid count={12} />
            </motion.div>
          ) : papers.length === 0 ? (
            <motion.div key="empty" {...CONTENT_SWAP} className="empty-state">
              No papers yet.{' '}
              <Link to="/upload" style={{ color: 'var(--accent-blue)' }}>Be the first to upload!</Link>
            </motion.div>
          ) : (
            <motion.div key="grid" {...CONTENT_SWAP} initial={{ opacity: 1 }} className="papers-grid papers-grid-inner">
              {papers.map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
