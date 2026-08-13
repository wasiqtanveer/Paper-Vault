import { describe, it, expect } from 'vitest';
import { looksLikePausedBackend } from './authErrors';

describe('looksLikePausedBackend', () => {
  it('matches network-shaped failures', () => {
    expect(looksLikePausedBackend(new TypeError('Failed to fetch'))).toBe(true);
    expect(looksLikePausedBackend({ message: 'Network request failed' })).toBe(true);
    expect(looksLikePausedBackend({ message: 'Request timeout' })).toBe(true);
    expect(looksLikePausedBackend({ message: 'Service unavailable' })).toBe(true);
    expect(looksLikePausedBackend({ name: 'AuthRetryableFetchError', message: '' })).toBe(true);
  });

  it('matches 5xx status codes in the message', () => {
    expect(looksLikePausedBackend({ message: 'Server returned 503' })).toBe(true);
    expect(looksLikePausedBackend({ message: 'Error 500' })).toBe(true);
  });

  it('matches status 0', () => {
    expect(looksLikePausedBackend({ status: 0, message: 'x' })).toBe(true);
  });

  it('does not match credential errors', () => {
    expect(looksLikePausedBackend({ message: 'Invalid login credentials', status: 400 })).toBe(false);
    expect(looksLikePausedBackend({ message: 'Email not confirmed' })).toBe(false);
  });

  it('does not match 5xx digits embedded in longer numbers', () => {
    expect(looksLikePausedBackend({ message: 'code 15000' })).toBe(false);
  });

  it('handles null and undefined', () => {
    expect(looksLikePausedBackend(null)).toBe(false);
    expect(looksLikePausedBackend(undefined)).toBe(false);
  });
});
