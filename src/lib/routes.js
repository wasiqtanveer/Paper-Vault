/**
 * Route chunk loaders, kept in one place so both the router and the navigation
 * can reach them.
 *
 * The router turns these into `lazy()` components; the sidebar warms them on
 * hover and the shell warms the rest at idle. That warming is what keeps route
 * changes animating: a cold chunk suspends the router subtree, and React swaps
 * the whole thing for the Suspense fallback — which tears out the outgoing page
 * mid-exit and replaces the transition with a spinner. Prefetching means the
 * chunk is already resolved by the time the click lands, so the transition runs.
 */
const loaders = {
  '/':             () => import('../pages/Home'),
  '/browse':       () => import('../pages/Browse'),
  '/paper':        () => import('../pages/PaperViewer'),
  '/login':        () => import('../pages/Login'),
  '/register':     () => import('../pages/Register'),
  '/upload':       () => import('../pages/Upload'),
  '/profile':      () => import('../pages/Profile'),
  '/mod':          () => import('../pages/ModDashboard'),
  '/admin':        () => import('../pages/AdminPanel'),
  '/about':        () => import('../pages/About'),
  '/hall-of-fame': () => import('../pages/HallOfFame'),
};

export const routeLoaders = loaders;

const warmed = new Set();

/** Warm a single route's chunk. Safe to call repeatedly — it only fetches once. */
export function prefetchRoute(path) {
  const load = loaders[path];
  if (!load || warmed.has(path)) return;
  warmed.add(path);
  // Swallow failures: a warm-up that fails is a non-event, and the real
  // navigation will surface any genuine loading error through Suspense.
  load().catch(() => warmed.delete(path));
}

/** Warm every remaining route chunk. Called at idle, after first paint. */
export function prefetchAllRoutes() {
  for (const path of Object.keys(loaders)) prefetchRoute(path);
}
