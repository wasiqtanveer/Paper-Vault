import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';

// The auth-state callback registered by the provider, so tests can drive events.
let emit;
const profiles = { u1: { id: 'u1', full_name: 'Student One', role: 'student' }, u2: { id: 'u2', full_name: 'Mod Two', role: 'moderator' } };
const maybeSingle = vi.fn();
const unsubscribe = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: cb => { emit = cb; return { data: { subscription: { unsubscribe } } }; },
      signOut: vi.fn(async () => ({})),
    },
    from: () => ({ select: () => ({ eq: (_c, id) => ({ maybeSingle: () => maybeSingle(id) }) }) }),
  },
}));

function Probe() {
  const a = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(a.loading)}</span>
      <span data-testid="ready">{String(a.profileReady)}</span>
      <span data-testid="role">{a.profile?.role ?? 'none'}</span>
      <span data-testid="staff">{String(a.isStaff)}</span>
      <span data-testid="error">{a.profileError}</span>
      <button onClick={a.signOut}>out</button>
    </div>
  );
}

const session = id => ({ user: { id, email: `${id}@x.com` } });
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 5)); });

beforeEach(() => {
  maybeSingle.mockReset();
  maybeSingle.mockImplementation(async id => ({ data: profiles[id], error: null }));
});

describe('AuthProvider', () => {
  it('loads the profile once from the initial session event', async () => {
    mount();
    act(() => emit('INITIAL_SESSION', session('u1')));
    await flush();
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(screen.getByTestId('role').textContent).toBe('student');
    expect(screen.getByTestId('staff').textContent).toBe('false');
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('does not refetch the profile on a token refresh for the same user', async () => {
    mount();
    act(() => emit('INITIAL_SESSION', session('u1')));
    await flush();
    act(() => emit('TOKEN_REFRESHED', session('u1')));
    await flush();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('resets readiness and loads the new role when a different account signs in', async () => {
    mount();
    act(() => emit('INITIAL_SESSION', session('u1')));
    await flush();
    act(() => emit('SIGNED_IN', session('u2')));
    expect(screen.getByTestId('ready').textContent).toBe('false');
    await flush();
    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('moderator'));
    expect(screen.getByTestId('staff').textContent).toBe('true');
  });

  it('clears the profile and becomes ready on sign-out', async () => {
    mount();
    act(() => emit('INITIAL_SESSION', session('u1')));
    await flush();
    act(() => emit('SIGNED_OUT', null));
    expect(screen.getByTestId('role').textContent).toBe('none');
    expect(screen.getByTestId('ready').textContent).toBe('true');
  });

  it('surfaces a profile fetch failure instead of hiding it', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    mount();
    act(() => emit('INITIAL_SESSION', session('u1')));
    await flush();
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('db down'));
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = mount();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
