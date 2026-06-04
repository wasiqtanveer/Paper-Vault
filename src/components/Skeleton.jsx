import './Skeleton.css';

/**
 * Shared skeleton-loader primitives. All build on the global `.skel` shimmer
 * (defined in styles/main.css) so loading placeholders look consistent across
 * pages. Replaces the bare spinners and per-page skeleton copies.
 */

/** A single shimmering line. `width` defaults to 100%. */
export function SkeletonLine({ width = '100%', height, style }) {
  return <div className="skel skel-line" style={{ width, ...(height ? { height } : {}), ...style }} />;
}

/** A generic shimmering block (e.g. an image area or stat tile). */
export function SkeletonBlock({ width = '100%', height = 80, className = '', style }) {
  return <div className={`skel skeleton-block ${className}`} style={{ width, height, ...style }} />;
}

/** A card placeholder matching PaperCard's image + body layout. */
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-img skel" />
      <div className="skeleton-body">
        <SkeletonLine width="80%" />
        <SkeletonLine width="55%" style={{ marginTop: 6 }} />
        <SkeletonLine width="40%" style={{ marginTop: 'auto' }} />
      </div>
    </div>
  );
}

/** A grid of SkeletonCards, mirroring `.papers-grid`. */
export function SkeletonCardGrid({ count = 8 }) {
  return (
    <div className="papers-grid papers-grid-inner">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

/** A shimmering table row with `cols` cells. */
export function SkeletonRow({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><div className="skel skeleton-row-cell" style={{ width: `${60 + ((i * 13) % 35)}%` }} /></td>
      ))}
    </tr>
  );
}

/**
 * Generic page placeholder: a topbar strip, a heading, and a card grid. Used
 * while a route's code or the auth session resolves, in place of a spinner, so
 * the first thing on screen already has the page's shape.
 */
export function PageSkeleton({ cards = 8 }) {
  return (
    <div className="page-content" aria-busy="true" aria-label="Loading">
      <div className="topbar">
        <SkeletonLine width={220} height={30} style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
      <div className="page-inner">
        <div className="page-header">
          <div style={{ width: '100%' }}>
            <SkeletonLine width={180} height={18} />
            <SkeletonLine width={260} style={{ marginTop: 8 }} />
          </div>
        </div>
        <SkeletonCardGrid count={cards} />
      </div>
    </div>
  );
}

/** Sidebar + page placeholder, shown for the instant before the session is read. */
export function ShellSkeleton() {
  return (
    <div className="app-shell">
      <aside className="sidebar sidebar-desktop shell-skel-sidebar" aria-hidden="true">
        <div className="shell-skel-logo"><SkeletonLine width={120} height={20} /></div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLine key={i} width={`${70 - (i % 3) * 12}%`} height={14} style={{ margin: '14px 16px 0' }} />
        ))}
      </aside>
      <main className="main-content">
        <PageSkeleton />
      </main>
    </div>
  );
}
