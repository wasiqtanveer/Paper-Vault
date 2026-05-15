import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import './Login.css';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form,      setForm]      = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [countdown, setCountdown] = useState(() => {
    const until = localStorage.getItem('pv_ratelimit_until');
    if (!until) return 0;
    const secs = Math.ceil((Number(until) - Date.now()) / 1000);
    return secs > 0 ? secs : 0;
  });
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown <= 0) { localStorage.removeItem('pv_ratelimit_until'); return; }
    timerRef.current = setInterval(() => {
      setCountdown(() => {
        const until = localStorage.getItem('pv_ratelimit_until');
        const secs = Math.ceil((Number(until) - Date.now()) / 1000);
        if (secs <= 0) { clearInterval(timerRef.current); localStorage.removeItem('pv_ratelimit_until'); return 0; }
        return secs;
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
          localStorage.setItem('pv_ratelimit_until', String(until));
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
                <input type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" required />
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
