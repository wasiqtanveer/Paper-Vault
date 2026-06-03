import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Mock the auth context so we can drive ProtectedRoute's branches directly.
const mockAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

function renderAt(ui) {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/secret" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => mockAuth.mockReset());

describe('ProtectedRoute', () => {
  it('shows a spinner while auth is loading', () => {
    mockAuth.mockReturnValue({ user: null, profile: null, loading: true });
    const { container } = renderAt(<ProtectedRoute><div>Secret</div></ProtectedRoute>);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('redirects to /login when there is no user', () => {
    mockAuth.mockReturnValue({ user: null, profile: null, loading: false });
    renderAt(<ProtectedRoute><div>Secret</div></ProtectedRoute>);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children for an authenticated user when no role is required', () => {
    mockAuth.mockReturnValue({ user: { id: '1' }, profile: { role: 'student' }, loading: false });
    renderAt(<ProtectedRoute><div>Secret</div></ProtectedRoute>);
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('blocks a user whose role is not allowed (403)', () => {
    mockAuth.mockReturnValue({ user: { id: '1' }, profile: { role: 'student' }, loading: false });
    renderAt(<ProtectedRoute roles={['admin']}><div>Secret</div></ProtectedRoute>);
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('allows a user whose role is in the allowed list', () => {
    mockAuth.mockReturnValue({ user: { id: '1' }, profile: { role: 'admin' }, loading: false });
    renderAt(<ProtectedRoute roles={['moderator', 'admin']}><div>Secret</div></ProtectedRoute>);
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});
