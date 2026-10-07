import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Search } from 'lucide-react';
import './CustomSelect.css';

/**
 * CustomSelect – accessible dropdown with optional built-in search.
 *
 * Follows the WAI-ARIA "select-only combobox" pattern: the trigger owns the
 * listbox, the active option is announced through aria-activedescendant, and
 * the whole thing works from the keyboard (arrows, Home/End, Enter/Space,
 * Escape, type-to-open).
 *
 * Props:
 *  value       – currently selected value
 *  onChange    – (value) => void
 *  options     – [{ value, label }]
 *  placeholder – shown when nothing selected
 *  style       – extra style for the wrapper
 *  searchable  – boolean; show a search input inside the menu
 *  id          – id for the trigger, so a <label htmlFor> can name it
 *  ariaLabel   – accessible name when there is no visible label
 */
export default function CustomSelect({ value, onChange, options, placeholder = 'Select…', style, searchable = false, id, ariaLabel }) {
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState('');
  const [active,    setActive]    = useState(-1);
  const [menuStyle, setMenuStyle] = useState({});

  const autoId   = useId();
  const listId   = `${autoId}-list`;
  const optId    = i => `${autoId}-opt-${i}`;

  const triggerRef = useRef(null);
  const buttonRef  = useRef(null);
  const menuRef    = useRef(null);
  const searchRef  = useRef(null);

  // Position the portal-rendered menu relative to the trigger
  const positionMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const menuH = 240; // max-height

    // Prefer below; flip above only if not enough space below
    const placeAbove = spaceBelow < Math.min(menuH, 160) && spaceAbove > spaceBelow;

    setMenuStyle({
      position: 'fixed',
      left:     rect.left,
      width:    rect.width,
      zIndex:   9999,
      ...(placeAbove
        ? { bottom: viewportH - rect.top + 4, top: 'auto' }
        : { top: rect.bottom + 4,             bottom: 'auto' }),
    });
  }, []);

  const selectedIndex = options.findIndex(o => String(o.value) === String(value));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function openMenu() {
    positionMenu();
    setQuery('');
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function closeMenu({ refocus = false } = {}) {
    setOpen(false);
    setQuery('');
    if (refocus) buttonRef.current?.focus();
  }

  function choose(o) {
    onChange(o.value);
    closeMenu({ refocus: true });
  }

  // Re-position on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    const onUpdate = () => positionMenu();
    window.addEventListener('scroll', onUpdate, true);
    window.addEventListener('resize', onUpdate);
    return () => {
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
    };
  }, [open, positionMenu]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current    && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search input when menu opens
  useEffect(() => {
    if (open && searchable && searchRef.current) {
      const t = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  // Keep the active option scrolled into view
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' });
    // optId is stable for this instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  // Shared key handling for the trigger (closed or open) and the search box.
  function onKeyDown(e) {
    const last = filtered.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      } else if (searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Type-to-search: open and seed the query with the first character.
        openMenu();
        setQuery(e.key);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(a => Math.min(last, a + 1)); break;
      case 'ArrowUp':   e.preventDefault(); setActive(a => Math.max(0, a - 1));    break;
      case 'Home':      e.preventDefault(); setActive(0);                          break;
      case 'End':       e.preventDefault(); setActive(last);                       break;
      case 'Enter':
        e.preventDefault();
        if (filtered[active]) choose(filtered[active]);
        break;
      case ' ':
        if (!searchable) { e.preventDefault(); if (filtered[active]) choose(filtered[active]); }
        break;
      case 'Escape': e.preventDefault(); closeMenu({ refocus: true }); break;
      case 'Tab':    closeMenu(); break;
      default: break;
    }
  }

  const activeDescendant = open && filtered[active] ? optId(active) : undefined;

  return (
    <div className="cselect" ref={triggerRef} style={style}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={'cselect-trigger' + (open ? ' open' : '')}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={searchable ? undefined : activeDescendant}
        aria-label={ariaLabel}
      >
        <span className={selected ? 'cselect-value' : 'cselect-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={13} className={'cselect-chevron' + (open ? ' rotated' : '')} aria-hidden="true" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <m.div
              ref={menuRef}
              className="cselect-menu"
              style={menuStyle}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
            >
              {searchable && (
                <div className="cselect-search-wrap">
                  <Search size={12} className="cselect-search-icon" aria-hidden="true" />
                  <input
                    ref={searchRef}
                    className="cselect-search"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setActive(0); }}
                    onKeyDown={onKeyDown}
                    placeholder="Search…"
                    aria-label="Search options"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeDescendant}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              )}
              <div className="cselect-options" role="listbox" id={listId} aria-label={ariaLabel ?? placeholder}>
                {filtered.length === 0 ? (
                  <div className="cselect-empty" role="option" aria-disabled="true" aria-selected="false">No results</div>
                ) : filtered.map((o, i) => {
                  const isSelected = String(o.value) === String(value);
                  return (
                    <div
                      key={o.value}
                      id={optId(i)}
                      role="option"
                      aria-selected={isSelected}
                      className={'cselect-option' + (isSelected ? ' selected' : '') + (i === active ? ' active' : '')}
                      onMouseEnter={() => setActive(i)}
                      // mousedown, not click: keeps focus where it is so the
                      // refocus to the trigger after choosing is clean.
                      onMouseDown={e => { e.preventDefault(); choose(o); }}
                    >
                      <span>{o.label}</span>
                      {isSelected && <Check size={12} aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            </m.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
