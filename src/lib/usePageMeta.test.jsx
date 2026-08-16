import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageMeta } from './usePageMeta';

const meta = () => document.querySelector('meta[name="description"]');

beforeEach(() => {
  meta()?.remove();
  document.title = '';
});

describe('usePageMeta', () => {
  it('sets the title with the PaperVault suffix', () => {
    renderHook(() => usePageMeta('Browse'));
    expect(document.title).toBe('Browse — PaperVault');
  });

  it('uses just the suffix when there is no title', () => {
    renderHook(() => usePageMeta(''));
    expect(document.title).toBe('PaperVault');
  });

  it('creates the description meta tag when missing', () => {
    renderHook(() => usePageMeta('About', 'All about us'));
    expect(meta().getAttribute('content')).toBe('All about us');
  });

  it('updates an existing description tag instead of adding another', () => {
    const tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    tag.setAttribute('content', 'old');
    document.head.appendChild(tag);

    renderHook(() => usePageMeta('About', 'new'));
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(meta().getAttribute('content')).toBe('new');
  });

  it('does not create a description tag when none is given', () => {
    renderHook(() => usePageMeta('Login'));
    expect(meta()).toBeNull();
  });

  it('updates when the inputs change', () => {
    const { rerender } = renderHook(({ t }) => usePageMeta(t), { initialProps: { t: 'One' } });
    expect(document.title).toBe('One — PaperVault');
    rerender({ t: 'Two' });
    expect(document.title).toBe('Two — PaperVault');
  });
});
