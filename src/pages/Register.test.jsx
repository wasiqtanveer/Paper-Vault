import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const signUp = vi.fn();
const single = vi.fn(() => Promise.resolve({ data: null }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signUp: (...a) => signUp(...a) },
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
  },
}));
vi.mock('../context/useAuth', () => ({ useAuth: () => ({ signInWithGoogle: vi.fn() }) }));
vi.mock('../context/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

import Register from './Register';

beforeEach(() => signUp.mockReset());

async function fill(user, { name = 'Ann Lee', email = 'ann@school.edu', password = 'secret12', confirm = 'secret12' } = {}) {
  await user.type(screen.getByPlaceholderText('Your full name'), name);
  await user.type(screen.getByPlaceholderText('you@example.com'), email);
  await user.type(screen.getByPlaceholderText('Min. 6 characters'), password);
  await user.type(screen.getByPlaceholderText('Repeat password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Create Account' }));
}

function setup() {
  render(<MemoryRouter><Register /></MemoryRouter>);
  return userEvent.setup();
}

describe('Register', () => {
  it('blocks submission when the passwords do not match', async () => {
    const user = setup();
    await fill(user, { confirm: 'different1' });
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('blocks disposable email domains', async () => {
    const user = setup();
    await fill(user, { email: 'x@mailinator.com' });
    expect(await screen.findByText('Please use a real email address.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('blocks passwords shorter than the minimum', async () => {
    const user = setup();
    await fill(user, { password: 'abc', confirm: 'abc' });
    expect(await screen.findByText('Password must be at least 6 characters.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('signs up and shows the confirmation screen for valid input', async () => {
    signUp.mockResolvedValue({ error: null });
    const user = setup();
    await fill(user);
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(signUp).toHaveBeenCalledWith({
      email: 'ann@school.edu',
      password: 'secret12',
      options: { data: { full_name: 'Ann Lee' } },
    });
  });
});
