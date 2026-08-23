import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./PaperPreview', () => ({ default: () => null }));

import PaperCard from './PaperCard';

const base = { id: 'p1', title: 'Physics Midterm', year: 2022, uploaded_at: '2022-05-10T12:00:00Z' };

function renderCard(paper) {
  return render(
    <MemoryRouter>
      <PaperCard paper={{ ...base, ...paper }} />
    </MemoryRouter>
  );
}

describe('PaperCard', () => {
  it('shows the uploader name from the joined profile', () => {
    renderCard({ profiles: { full_name: 'Ann Lee' } });
    expect(screen.getByText('Ann Lee')).toBeInTheDocument();
  });

  it('uses uploader_name when there is no joined profile', () => {
    renderCard({ uploader_name: 'Bob Ray' });
    expect(screen.getByText('Bob Ray')).toBeInTheDocument();
  });

  it('falls back to Unknown when no uploader is available', () => {
    renderCard({});
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    renderCard({ profiles: { full_name: null } });
    expect(screen.getAllByText('Unknown')).toHaveLength(2);
  });

  it('links to the paper page and shows title, subject and year', () => {
    renderCard({ subjects: { name: 'Physics' }, semester: 'Fall' });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/paper/p1');
    expect(screen.getByText('Physics Midterm')).toBeInTheDocument();
    expect(screen.getByText(/Physics · 2022 · Fall/)).toBeInTheDocument();
  });

  it('renders a placeholder instead of an image when there is no image_url', () => {
    renderCard({});
    expect(screen.queryByRole('img')).toBeNull();
  });
});
