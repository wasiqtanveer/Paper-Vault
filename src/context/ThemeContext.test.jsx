import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeContext';
import { useTheme } from './useTheme';

function Probe() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>{theme}</button>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '<meta name="theme-color" content="#0a0a0a">';
});

describe('ThemeProvider', () => {
  it('defaults to dark and applies it to the document', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('starts from the saved theme', () => {
    localStorage.setItem('pv-theme', 'light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('light');
  });

  it('toggles, persists, and updates the theme-color meta', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(localStorage.getItem('pv-theme')).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe('#f5f5f5');
  });

  it('still works when storage is blocked', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    await act(async () => { await userEvent.click(screen.getByRole('button')); });
    expect(screen.getByRole('button')).toHaveTextContent('light');
    get.mockRestore();
    set.mockRestore();
  });
});
