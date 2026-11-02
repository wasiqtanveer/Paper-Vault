import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, DATE_SHORT, DATE_LONG, MONTH_YEAR } from './formatDate';

describe('formatDate', () => {
  const iso = '2026-03-09T12:00:00Z';

  it('formats the short, long and month-year styles', () => {
    expect(formatDate(iso, DATE_SHORT)).toBe('Mar 9');
    expect(formatDate(iso, DATE_LONG)).toBe('March 9, 2026');
    expect(formatDate(iso, MONTH_YEAR)).toBe('March 2026');
  });

  it('defaults to short month, day and year', () => {
    expect(formatDate(iso)).toBe('Mar 9, 2026');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });
});
