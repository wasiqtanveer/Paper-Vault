import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInput from './PasswordInput';

describe('PasswordInput', () => {
  it('is masked by default with a "Show password" toggle', () => {
    render(<PasswordInput id="pw" value="secret" onChange={() => {}} />);
    expect(document.getElementById('pw')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('reveals the password, then hides it again', async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="pw" value="secret" onChange={() => {}} />);
    const input = document.getElementById('pw');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    await waitFor(() => expect(input).toHaveAttribute('type', 'text'));
    const hide = screen.getByRole('button', { name: 'Hide password' });
    expect(hide).toHaveClass('pw-toggle-active');

    await user.click(hide);
    await waitFor(() => expect(input).toHaveAttribute('type', 'password'));
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('forwards the value and extra props to the input', () => {
    render(<PasswordInput id="pw" value="abc" onChange={() => {}} placeholder="Password" autoComplete="current-password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveValue('abc');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
  });

  it('keeps the toggle out of the tab order and does not submit forms', () => {
    render(<PasswordInput id="pw" value="" onChange={() => {}} />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('tabindex', '-1');
    expect(toggle).toHaveAttribute('type', 'button');
  });
});
