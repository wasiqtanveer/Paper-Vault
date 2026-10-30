import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/usePageMeta';

export default function NotFound() {
  usePageMeta('Page not found');
  return (
    <div className="page-content">
      <div className="topbar"><span className="topbar-title">Page not found</span></div>
      <div className="page-inner">
        <div className="empty-state">
          That page doesn&apos;t exist. <Link to="/browse" style={{ color: 'var(--accent-blue)' }}>Browse papers</Link>
        </div>
      </div>
    </div>
  );
}
