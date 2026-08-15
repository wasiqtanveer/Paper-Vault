import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
vi.mock('./supabase', () => ({ supabase: { from: (...a) => from(...a) } }));

import { logActivity } from './activity';

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null });
  from.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe('logActivity', () => {
  it('inserts the full payload into activity_log and returns true', async () => {
    const ok = await logActivity({
      action: 'approve',
      user: { id: 'u1', email: 'a@b.c' },
      profile: { full_name: 'Ann', role: 'moderator' },
      paperId: 'p1',
      paperTitle: 'Physics 2020',
    });
    expect(ok).toBe(true);
    expect(from).toHaveBeenCalledWith('activity_log');
    expect(insert).toHaveBeenCalledWith({
      action: 'approve',
      actor_id: 'u1',
      actor_name: 'Ann',
      actor_role: 'moderator',
      paper_id: 'p1',
      paper_title: 'Physics 2020',
    });
  });

  it('falls back to email, fallbackRole and nulls', async () => {
    await logActivity({ action: 'upload', user: { id: 'u1', email: 'a@b.c' }, fallbackRole: 'student' });
    expect(insert).toHaveBeenCalledWith({
      action: 'upload',
      actor_id: 'u1',
      actor_name: 'a@b.c',
      actor_role: 'student',
      paper_id: null,
      paper_title: null,
    });
  });

  it('handles a missing user and profile', async () => {
    await logActivity({ action: 'delete' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      actor_id: null, actor_name: null, actor_role: null,
    }));
  });

  it('warns and returns false when the insert fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    insert.mockResolvedValue({ error: { message: 'rls denied' } });
    const ok = await logActivity({ action: 'reject' });
    expect(ok).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"reject"'), 'rls denied');
  });
});
