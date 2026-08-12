import { describe, it, expect, vi } from 'vitest';

vi.mock('browser-image-compression', () => ({ default: vi.fn() }));

import { formatBytes, validateImageSize, validateImage } from './imageUtils';

const MB = 1024 * 1024;

describe('formatBytes', () => {
  it('formats bytes, KB and MB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(MB - 1)).toBe('1024.0 KB');
    expect(formatBytes(MB)).toBe('1.00 MB');
    expect(formatBytes(2.5 * MB)).toBe('2.50 MB');
  });
});

describe('validateImageSize', () => {
  it('accepts exactly 5MB', () => {
    expect(() => validateImageSize({ size: 5 * MB })).not.toThrow();
  });

  it('rejects anything over 5MB', () => {
    expect(() => validateImageSize({ size: 5 * MB + 1 })).toThrow('Image must be under 5MB');
  });
});

describe('validateImage', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', type => {
    expect(() => validateImage({ type, size: 1000 })).not.toThrow();
  });

  it.each(['image/gif', 'application/pdf', ''])('rejects type "%s"', type => {
    expect(() => validateImage({ type, size: 1000 })).toThrow('JPEG, PNG or WEBP');
  });

  it('still applies the size limit to valid types', () => {
    expect(() => validateImage({ type: 'image/png', size: 5 * MB + 1 })).toThrow('under 5MB');
  });
});
