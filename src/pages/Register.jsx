import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PasswordInput from '../components/PasswordInput';
import './Login.css';
import './Register.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </g>
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const { addToast } = useToast();
  const [gLoading, setGLoading] = useState(false);
  const [form,      setForm]      = useState({ fullName: '', email: '', password: '', confirm: '' });
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

  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown]);

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
    if (form.password.length < 6)      { setError('Password must be at least 6 characters.'); return; }
    const emailDomain = form.email.split('@')[1]?.toLowerCase() ?? '';
    const throwaway = ['mailinator.com','guerrillamail.com','tempmail.com','10minutemail.com','yopmail.com','trashmail.com','sharklasers.com','disposablemail.com'];
    if (throwaway.includes(emailDomain)) { setError('Please use a real email address.'); return; }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName } },
      });
      if (signUpError) {
        const msg = signUpError.message || '';
        if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('limit')) {
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
      <div className="form-page-brand">Paper<span>Vault</span></div>
      <div className="form-card">
        <div className="form-title">Create account</div>
        <div className="form-subtitle">Join PaperVault to upload past papers</div>

        <button className="btn-google" onClick={async () => { setGLoading(true); try { await signInWithGoogle(); } catch { setGLoading(false); } }} disabled={gLoading}>
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
                <input value={form.fullName} onChange={set('fullName')} placeholder="Your full name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <PasswordInput value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
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
      </div>
    </div>
  );
}
