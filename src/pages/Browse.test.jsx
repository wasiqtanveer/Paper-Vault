import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Browse from './Browse';

// A chainable, awaitable stand-in for a Supabase query builder.
const calls = [];
function builder(result) {
  const b = {};
  for (const m of ['select', 'eq', 'or', 'ilike', 'order', 'range', 'is']) {
    b[m] = (...args) => { calls.push([m, ...args]); return b; };
  }
  b.then = (res, rej) => Promise.resolve(result).then(res, rej);
  return b;
}

const papers = [
  { id: 'p1', title: 'Calculus — 2024 — Final', year: 2024, semester: 'Fall', exam_type: 'Final', status: 'approved', image_url: 'x', uploader_name: 'Ana', subjects: { name: 'Calculus' }, teachers: null },
  { id: 'p2', title: 'Physics — 2023 — Mid', year: 2023, semester: 'Spring', exam_type: 'Mid', status: 'approved', image_url: 'y', uploader_name: 'Bo', subjects: { name: 'Physics' }, teachers: null },
];

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: table => (table === 'papers'
      ? builder({ data: papers, count: 2, error: null })
      : builder({ data: [{ id: 's1', name: 'Calculus' }], error: null })),
    rpc: () => builder({ data: [{ year: 2024 }, { year: 2023 }], error: null }),
  },
}));
// Stable reference, like the real context: a new function each render would retrigger Browse's fetch effect.
const toast = { addToast: vi.fn() };
vi.mock('../context/useToast', () => ({ useToast: () => toast }));
vi.mock('../components/PaperCard', () => ({ default: ({ paper }) => <div data-testid="card">{paper.title}</div> }));

function Where() {
  const { search } = useLocation();
  return <div data-testid="search">{search}</div>;
}

const renderAt = url => render(
  <MemoryRouter initialEntries={[url]}><Browse /><Where /></MemoryRouter>,
);

beforeEach(() => { calls.length = 0; });

describe('Browse', () => {
  it('lists approved papers and shows the total count', async () => {
    renderAt('/browse');
    expect(await screen.findAllByTestId('card')).toHaveLength(2);
    expect(screen.getByText('2 papers')).toBeInTheDocument();
    expect(calls.some(c => c[0] === 'eq' && c[1] === 'status' && c[2] === 'approved')).toBe(true);
  });

  it('reads initial filters from the URL and keeps unrelated params', async () => {
    renderAt('/browse?semester=Fall&utm=keep');
    await screen.findAllByTestId('card');
    expect(calls.some(c => c[0] === 'eq' && c[1] === 'semester' && c[2] === 'Fall')).toBe(true);
    expect(screen.getByTestId('search').textContent).toContain('utm=keep');
    expect(screen.getByTestId('search').textContent).toContain('semester=Fall');
  });

  it('mirrors the search box into the URL after the debounce', async () => {
    renderAt('/browse');
    await screen.findAllByTestId('card');
    const box = screen.getByRole('searchbox');
    fireEvent.change(box, { target: { value: 'calc' } });
    expect(box).toHaveValue('calc');
    await waitFor(() => expect(calls.some(c => c[0] === 'or')).toBe(true), { timeout: 2000 });
    await waitFor(() => expect(screen.getByTestId('search').textContent).toContain('q=calc'), { timeout: 2000 });
  });

  it('escapes LIKE wildcards in the search term', async () => {
    renderAt('/browse?q=100%25');
    await screen.findAllByTestId('card');
    const or = calls.find(c => c[0] === 'or');
    // % is escaped for LIKE (\%), and that backslash is escaped again for the quoted PostgREST value (\\%).
    expect(or[1]).toContain('100\\\\%');
  });
});
