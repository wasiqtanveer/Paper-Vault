import { m } from 'framer-motion';
import { ChevronUp, ArrowUpDown } from 'lucide-react';

/** Sortable column header with animated icon */
export default function SortTh({ col, label, sort, onSort, style }) {
  const active = sort.col === col;
  return (
    <th style={style}>
      <button
        type="button"
        className={'sort-th-btn' + (active ? ' sort-th-active' : '')}
        onClick={() => onSort(col)}
      >
        {label}
        <m.span
          className="sort-th-icon"
          animate={active ? { rotate: sort.dir === 'asc' ? 0 : 180, opacity: 1 } : { rotate: 0, opacity: 0.4 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          {active ? <ChevronUp size={11} /> : <ArrowUpDown size={11} />}
        </m.span>
      </button>
    </th>
  );
}
