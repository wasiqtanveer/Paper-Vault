import GoogleIcon from '../components/GoogleIcon';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import PasswordInput from '../components/PasswordInput';
import AuthHelp from '../components/AuthHelp';
import ThemeLogo from '../components/ThemeLogo';
import { looksLikePausedBackend } from '../lib/authErrors';
import { MIN_PASSWORD_LENGTH } from '../lib/authRules';
import { isDisposableEmail } from '../lib/disposableEmail';
import './Login.css';
import './Register.css';

export default function Register() {
  const { signInWithGoogle } = useAuth();
  const [gLoading, setGLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [form,     setForm]      = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  // On mount, fetch the global rate limit expiry from Supabase
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'email_ratelimit_until')
      .single()
      .then(({ data }) => {
        if (!data) return;
        const secs = Math.ceil((Number(data.value) - Date.now()) / 1000);
        if (secs > 0) setCountdown(secs);
      });
  }, []);

  // Keyed on whether a countdown is running, not its value: depending on
  // `countdown` re-created the interval on every tick.
  const counting = countdown > 0;
  useEffect(() => {
    if (!counting) return;
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [counting]);

  function set(key) { return e => setForm(f => ({ ...f, [key]: e.target.value })); }

  function fmtCountdown(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec.toString().padStart(2,'0')}s` : `${sec}s`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (countdown > 0) return;
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < MIN_PASSWORD_LENGTH) { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (isDisposableEmail(form.email)) { setError('Please use a real email address.'); return; }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName } },
      });
      if (signUpError) {
        const msg = signUpError.message || '';
        if (looksLikePausedBackend(signUpError)) {
          setError('We couldn\'t reach the server. It may be paused.');
          setHelpOpen(true);
        } else if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('limit')) {
          const until = Date.now() + 3600 * 1000;
          // Write expiry to Supabase so all users see the same countdown
          await supabase.from('app_settings').update({ value: String(until) }).eq('key', 'email_ratelimit_until');
          setCountdown(3600);
        } else if (msg.toLowerCase().includes('sending') || msg.toLowerCase().includes('email') || msg === '{}' || msg === '') {
          setError('We couldn\'t send a confirmation email right now. Please try again in a moment.');
        } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
          setError('An account with this email already exists. Try signing in instead.');
        } else {
          setError(msg || 'Registration failed. Please try again.');
        }
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      if (looksLikePausedBackend(err)) setHelpOpen(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) return (
    <div className="form-page">
      <div className="form-card" style={{ textAlign: 'center', gap: 12 }}>
        <div className="form-title" style={{ fontSize: 32 }}>📬</div>
        <div className="form-title">Check your email</div>
        <div className="form-subtitle">
          We sent a confirmation link to <strong>{form.email}</strong>.<br />
          Click it to activate your account, then sign in.
        </div>
        <Link to="/login" className="form-submit" style={{ marginTop: 16, display: 'block', textAlign: 'center' }}>
          Go to Sign In
        </Link>
      </div>
    </div>
  );

  return (
    <div className="form-page">
      <div className="form-page-brand"><ThemeLogo size={150} /></div>
      <div className="form-card">
        <div className="form-title">Create account</div>
        <div className="form-subtitle">Join PaperVault to upload past papers</div>

        <button type="button" className="btn-google" onClick={async () => { setGLoading(true); try { await signInWithGoogle(); } catch (err) { setGLoading(false); if (looksLikePausedBackend(err)) setHelpOpen(true); } }} disabled={gLoading}>
          <GoogleIcon /> {gLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="form-divider-label"><span>or</span></div>

        {countdown > 0 ? (
          <div className="rate-limit-box">
            <div className="rate-limit-icon">⏳</div>
            <div className="rate-limit-title">Too much traffic right now</div>
            <div className="rate-limit-subtitle">Registration emails are temporarily limited. Try again in:</div>
            <div className="rate-limit-countdown">{fmtCountdown(countdown)}</div>
            <div className="rate-limit-hint">You can also try again later or come back in an hour.</div>
          </div>
        ) : (
          <>
            {error && <div className="inline-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input value={form.fullName} onChange={set('fullName')} placeholder="Your full name" maxLength={60} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <PasswordInput value={form.password} onChange={set('password')} placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <PasswordInput value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" required />
              </div>
              <button type="submit" className="form-submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          </>
        )}

        <div className="form-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
        <AuthHelp open={helpOpen} onToggle={() => setHelpOpen(o => !o)} />
      </div>
    </div>
  );
}
