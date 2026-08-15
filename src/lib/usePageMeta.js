import { useEffect } from 'react';

const SUFFIX = 'PaperVault';

/**
 * Set the document title (and optional meta description) for a route.
 * SPA-friendly: updates on mount and whenever the inputs change. The title is
 * left for the next page to set; the description is restored on unmount. Pass just a title for most
 * pages; pass a description for public, indexable pages.
 *
 * @param {string} title        page title (without the " — PaperVault" suffix)
 * @param {string} [description] meta description for SEO / link previews
 */
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} — ${SUFFIX}` : SUFFIX;

    if (!description) return undefined;
    let tag = document.querySelector('meta[name="description"]');
    const created = !tag;
    const previous = tag?.getAttribute('content') ?? null;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', description);

    // Restore on unmount so a later page without its own description falls
    // back to the site default instead of inheriting this one's.
    return () => {
      if (created) tag.remove();
      else if (previous !== null) tag.setAttribute('content', previous);
    };
  }, [title, description]);
}
