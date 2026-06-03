import { useEffect } from 'react';

const SUFFIX = 'PaperVault';

/**
 * Set the document title (and optional meta description) for a route.
 * SPA-friendly: updates on mount and whenever the inputs change, restoring
 * nothing on unmount (the next page sets its own). Pass just a title for most
 * pages; pass a description for public, indexable pages.
 *
 * @param {string} title        page title (without the " — PaperVault" suffix)
 * @param {string} [description] meta description for SEO / link previews
 */
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} — ${SUFFIX}` : SUFFIX;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}
