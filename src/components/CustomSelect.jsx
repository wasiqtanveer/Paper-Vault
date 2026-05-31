import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Search } from 'lucide-react';
import './CustomSelect.css';

/**
 * CustomSelect – accessible dropdown with optional built-in search.
 *
 * Props:
 *  value       – currently selected value
 *  onChange    – (value) => void
 *  options     – [{ value, label }]
 *  placeholder – shown when nothing selected
 *  style       – extra style for the wrapper
 *  searchable  – boolean; show a search input inside the menu
 */
export default function CustomSelect({ value, onChange, options, placeholder = 'Select…', style, searchable = false }) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState('');
  const [menuStyle, setMenuStyle] = useState({});

  const triggerRef = useRef(null);
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

  // Open/close
  function toggle() {
    if (!open) {
      positionMenu();
      setOpen(true);
      setQuery('');
    } else {
      setOpen(false);
    }
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
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, searchable]);

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="cselect" ref={triggerRef} style={style}>
      <button
        type="button"
        className={'cselect-trigger' + (open ? ' open' : '')}
        onClick={toggle}
      >
        <span className={selected ? 'cselect-value' : 'cselect-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={13} className={'cselect-chevron' + (open ? ' rotated' : '')} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
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
                  <Search size={12} className="cselect-search-icon" />
                  <input
                    ref={searchRef}
                    className="cselect-search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search…"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              )}
              <div className="cselect-options">
                {filtered.length === 0 ? (
                  <div className="cselect-empty">No results</div>
                ) : filtered.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    className={'cselect-option' + (String(o.value) === String(value) ? ' selected' : '')}
                    onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                  >
                    <span>{o.label}</span>
                    {String(o.value) === String(value) && <Check size={12} />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
