import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider } from './ToastContext';
import { useToast } from './useToast';

// ToastProvider reads the sound context for outcome sounds; stub it out.
vi.mock('./useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));

function Trigger({ onClick }) {
  const { addToast } = useToast();
  return <button onClick={() => addToast(...onClick)}>go</button>;
}

const setup = args => render(<ToastProvider><Trigger onClick={args} /></ToastProvider>);

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('Toast', () => {
  it('shows a message with a status role and dismisses itself after 3.5s', () => {
    setup(['Saved', 'success']);
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    act(() => { vi.advanceTimersByTime(3600); });
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('announces errors with the alert role', () => {
    setup(['Nope', 'error']);
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByRole('alert')).toHaveTextContent('Nope');
  });

  it('runs the action and closes the toast', () => {
    const undo = vi.fn();
    setup(['Archived', 'info', { action: { label: 'Undo', onClick: undo } }]);
    fireEvent.click(screen.getByText('go'));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Archived')).toBeNull();
  });

  it('keeps an action toast beyond the normal delay', () => {
    setup(['Archived', 'info', { action: { label: 'Undo', onClick: vi.fn() } }]);
    fireEvent.click(screen.getByText('go'));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('pauses the countdown while the toast is hovered', () => {
    setup(['Hold on', 'info']);
    fireEvent.click(screen.getByText('go'));
    const toast = screen.getByRole('status');
    fireEvent.mouseEnter(toast);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByText('Hold on')).toBeInTheDocument();
    fireEvent.mouseLeave(toast);
    act(() => { vi.advanceTimersByTime(2600); });
    expect(screen.queryByText('Hold on')).toBeNull();
  });

  it('dismisses on the close button', () => {
    setup(['Bye', 'info']);
    fireEvent.click(screen.getByText('go'));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Bye')).toBeNull();
  });
});
