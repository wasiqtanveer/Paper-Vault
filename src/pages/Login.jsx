import GoogleIcon from '../components/GoogleIcon';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import PasswordInput from '../components/PasswordInput';
import AuthHelp from '../components/AuthHelp';
import ThemeLogo from '../components/ThemeLogo';
import { looksLikePausedBackend } from '../lib/authErrors';
import './Login.css';

export default function Login() {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || '/';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notice,   setNotice]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
      if (looksLikePausedBackend(err)) setHelpOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    setError(''); setNotice('');
    if (!email.trim()) { setError('Enter your email above, then choose "Forgot password?".'); return; }
    try {
      await resetPassword(email.trim());
      // Same message whether or not the address has an account.
      setNotice('If that email has an account, a reset link is on its way.');
    } catch (err) {
      setError(err.message || 'Could not send the reset email.');
      if (looksLikePausedBackend(err)) setHelpOpen(true);
    }
  }

  async function handleGoogle() {
    setGLoading(true);
    try { await signInWithGoogle(); }
    catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setGLoading(false);
      if (looksLikePausedBackend(err)) setHelpOpen(true);
    }
  }

  return (
    <div className="form-page">
      <div className="form-page-brand"><ThemeLogo size={150} /></div>
      <div className="form-card">
        <div className="form-title">Welcome back</div>
        <div className="form-subtitle">Sign in to your PaperVault account</div>

        {error && <div className="inline-error">{error}</div>}
        {notice && <div className="form-hint" role="status">{notice}</div>}

        <button type="button" className="btn-google" onClick={handleGoogle} disabled={gLoading || loading}>
          <GoogleIcon /> {gLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="form-divider-label"><span>or</span></div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleForgot} style={{ marginBottom: 12 }}>
            Forgot password?
          </button>
          <button type="submit" className="form-submit" disabled={loading || gLoading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="form-footer">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </div>
        <AuthHelp open={helpOpen} onToggle={() => setHelpOpen(o => !o)} />
      </div>
    </div>
  );
}
