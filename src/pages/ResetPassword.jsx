import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/useToast';
import PasswordInput from '../components/PasswordInput';
import { usePageMeta } from '../lib/usePageMeta';
import { MIN_PASSWORD_LENGTH } from '../lib/authRules';
import './Login.css';

/**
 * Landing page for the password-recovery email. Following the link signs the
 * user in with a recovery session, so all that's left is choosing a new password.
 */
export default function ResetPassword() {
  usePageMeta('Reset password');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (next.length < MIN_PASSWORD_LENGTH) { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (next !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (err) { setError(err.message); return; }
    addToast('Password updated.', 'success');
    navigate('/', { replace: true });
  }

  return (
    <div className="page-content">
      <div className="page-inner">
        <div className="form-card" style={{ margin: '40px auto' }}>
          <div className="form-title">Choose a new password</div>
          <div className="form-subtitle">You&apos;re signed in through your recovery link.</div>
          {error && <div className="inline-error" role="alert">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="rp-new">New password</label>
              <PasswordInput id="rp-new" value={next} onChange={e => setNext(e.target.value)} placeholder="New password" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="rp-confirm">Confirm password</label>
              <PasswordInput id="rp-confirm" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" required />
            </div>
            <button type="submit" className="form-submit" disabled={loading}>
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
