import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const auth = { signIn: vi.fn(), signInWithGoogle: vi.fn(), resetPassword: vi.fn() };
vi.mock('../context/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../context/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

import Login from './Login';

beforeEach(() => {
  auth.signIn.mockReset();
  auth.signInWithGoogle.mockReset();
  auth.resetPassword.mockReset();
});

async function fillAndSubmit(user, email = 'a@b.com', password = 'secret12') {
  await user.type(screen.getByPlaceholderText('you@example.com'), email);
  await user.type(screen.getByPlaceholderText('••••••••'), password);
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
}

const helpTrigger = () => screen.getByRole('button', { name: /Can.t sign in\?/ });

function setup() {
  render(<MemoryRouter><Login /></MemoryRouter>);
  return userEvent.setup();
}

describe('Login', () => {
  it('shows the error message when sign-in fails with bad credentials, help stays closed', async () => {
    auth.signIn.mockRejectedValue(new Error('Invalid login credentials'));
    const user = setup();
    await fillAndSubmit(user);
    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
    expect(helpTrigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('falls back to a generic message when the error has none', async () => {
    auth.signIn.mockRejectedValue(new Error(''));
    const user = setup();
    await fillAndSubmit(user);
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('opens the paused-backend help when the failure looks like a network error', async () => {
    auth.signIn.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = setup();
    await fillAndSubmit(user);
    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
    expect(helpTrigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/pauses a project after 7 days/)).toBeInTheDocument();
  });

  it('asks for an email before sending a reset link', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByText(/Enter your email above/)).toBeInTheDocument();
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('shows a neutral notice after requesting a reset', async () => {
    auth.resetPassword.mockResolvedValue();
    const user = setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(await screen.findByText(/reset link is on its way/)).toBeInTheDocument();
    expect(auth.resetPassword).toHaveBeenCalledWith('a@b.com');
  });
});
