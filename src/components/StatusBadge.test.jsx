import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it.each(['pending', 'approved', 'rejected'])('renders the "%s" label with its badge class', status => {
    render(<StatusBadge status={status} />);
    const el = screen.getByText(status);
    expect(el).toHaveClass('badge', `badge-${status}`);
  });
});
