import { describe, it, expect } from 'vitest';
import { escapeLike } from './query';

describe('escapeLike', () => {
  it('escapes % and _ so they match literally', () => {
    expect(escapeLike('100%_sure')).toBe('100\\%\\_sure');
  });

  it('escapes backslashes', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeLike('Calculus II')).toBe('Calculus II');
  });
});
