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
