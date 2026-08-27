import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from './useFocusTrap';

function Dialog() {
  const ref = useFocusTrap();
  return (
    <div ref={ref} role="dialog">
      <button>first</button>
      <button>last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('moves focus to the first control on mount', () => {
    render(<Dialog />);
    expect(screen.getByText('first')).toHaveFocus();
  });

  it('wraps Tab from the last control to the first and Shift+Tab back', async () => {
    const user = userEvent.setup();
    render(<Dialog />);
    await user.tab();
    expect(screen.getByText('last')).toHaveFocus();
    await user.tab();
    expect(screen.getByText('first')).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText('last')).toHaveFocus();
  });

  it('restores focus to the opener on unmount', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<Dialog />);
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
