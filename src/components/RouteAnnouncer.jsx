import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SPA navigation is silent to screen readers: the page changes but nothing is
 * announced and focus stays on the old link. On each route change this moves
 * focus to the main region and announces the new page title.
 */
export default function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [message, setMessage] = useState('');
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; } // don't steal focus on initial load
    // Wait a tick so usePageMeta has updated document.title for the new page.
    const t = setTimeout(() => {
      setMessage(document.title);
      const main = document.getElementById('main-scroll');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    }, 150);
    return () => clearTimeout(t);
  }, [pathname]);

  return <div className="sr-only" role="status" aria-live="polite">{message}</div>;
}
