import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle, Clock, ShieldCheck, Settings2, Users, KeyRound, ChevronDown, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteImage } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import { SkeletonRow } from '../components/Skeleton';
import './Profile.css';

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, delay: i * 0.06, ease: 'easeOut' } },
});

export default function Profile() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const [papers,    setPapers]    = useState([]);
  const [modStats,  setModStats]  = useState(null);
  const [userCount, setUserCount] = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Edit name accordion
  const [nameOpen,    setNameOpen]    = useState(false);
  const [nameValue,   setNameValue]   = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError,   setNameError]   = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);

  // Change password accordion
  const [pwOpen,    setPwOpen]    = useState(false);
  const [pwForm,    setPwForm]    = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const isMod   = profile?.role === 'moderator' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!user) return;
    const queries = [
      supabase.from('papers').select('*, subjects(name)').eq('uploader_id', user.id).order('uploaded_at', { ascending: false }),
    ];
    if (isMod) {
      queries.push(
        supabase.from('papers').select('id, status').eq('reviewed_by', user.id)
      );
    }
    if (isAdmin) {
      queries.push(supabase.from('profiles').select('id', { count: 'exact', head: true }));
    }

    Promise.all(queries).then(([papersRes, modRes, adminRes]) => {
      setPapers(papersRes.data ?? []);
      if (modRes) {
        const reviewed = modRes.data ?? [];
        setModStats({
          total:    reviewed.length,
          approved: reviewed.filter(p => p.status === 'approved').length,
          rejected: reviewed.filter(p => p.status === 'rejected').length,
        });
      }
      if (adminRes) setUserCount(adminRes.count ?? 0);
      setLoading(false);
    });
  }, [user, isMod, isAdmin]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(''); setPwSuccess(false);
    if (pwForm.next.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    setPwLoading(true);
    // Re-authenticate first to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: pwForm.current,
    });
    if (signInErr) { setPwError('Current password is incorrect.'); setPwLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    setPwSuccess(true);
    setPwForm({ current: '', next: '', confirm: '' });
    setTimeout(() => { setPwOpen(false); setPwSuccess(false); }, 2000);
    addToast('Password updated successfully.', 'success');
  }

  async function handleChangeName(e) {
    e.preventDefault();
    setNameError(''); setNameSuccess(false);
    if (!nameValue.trim()) { setNameError('Name cannot be empty.'); return; }
    setNameLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: nameValue.trim() }).eq('id', user.id);
    setNameLoading(false);
    if (error) { setNameError(error.message); return; }
    setNameSuccess(true);
    addToast('Name updated.', 'success');
    setTimeout(() => { setNameOpen(false); setNameSuccess(false); }, 1500);
  }

  async function handleDelete(paper) {
    if (!window.confirm('Delete this paper?')) return;
    try { await deleteImage(paper.image_url); } catch (_) {}
    const { error } = await supabase.from('papers').delete().eq('id', paper.id);
    if (error) { addToast(error.message, 'error'); return; }
    setPapers(prev => prev.filter(p => p.id !== paper.id));
    addToast('Paper deleted.', 'success');
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : '—';

  const uploadedCount  = papers.length;
  const approvedCount  = papers.filter(p => p.status === 'approved').length;
  const pendingCount   = papers.filter(p => p.status === 'pending').length;

  return (
    <div className="page-content">
      <div className="topbar">
        <span style={{ fontSize: 18, fontWeight: 700 }}>Profile</span>
      </div>

      <div className="page-inner">

        {/* Header card */}
        <motion.div className="profile-header-card" {...fadeUp(0)}>
          <div className="profile-avatar">{initials}</div>
          <div className="profile-header-info">
            <div className="profile-name">{profile?.full_name ?? 'Unknown'}</div>
            <div className="profile-meta">{profile?.email} · Joined {joinDate}</div>
          </div>
          <div className={`profile-role-badge role-${profile?.role ?? 'student'}`}>
            {profile?.role ?? 'student'}
          </div>
        </motion.div>

        {/* Edit name accordion */}
        <motion.div className="pw-accordion" {...fadeUp(1)}>
          <button
            className={'pw-accordion-trigger' + (nameOpen ? ' open' : '')}
            onClick={() => { setNameOpen(v => !v); setNameValue(profile?.full_name ?? ''); setNameError(''); setNameSuccess(false); }}
          >
            <span className="pw-accordion-label"><Pencil size={14} /> Edit Name</span>
            <ChevronDown size={14} className={'pw-accordion-chevron' + (nameOpen ? ' rotated' : '')} />
          </button>
          <AnimatePresence initial={false}>
            {nameOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <form className="pw-form" onSubmit={handleChangeName}>
                  {nameSuccess && <div className="pw-success">Name updated!</div>}
                  {nameError   && <div className="form-error">{nameError}</div>}
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Display Name</label>
                    <input value={nameValue} onChange={e => setNameValue(e.target.value)} placeholder="Your full name" />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={nameLoading}>
                    {nameLoading ? 'Saving…' : 'Save Name'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Change password accordion */}
        <motion.div className="pw-accordion" {...fadeUp(2)}>
          <button
            className={'pw-accordion-trigger' + (pwOpen ? ' open' : '')}
            onClick={() => { setPwOpen(v => !v); setPwError(''); setPwSuccess(false); }}
          >
            <span className="pw-accordion-label">
              <KeyRound size={14} />
              Change Password
            </span>
            <ChevronDown size={14} className={'pw-accordion-chevron' + (pwOpen ? ' rotated' : '')} />
          </button>

          <AnimatePresence initial={false}>
            {pwOpen && (
              <motion.div
                className="pw-accordion-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <form className="pw-form" onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={pwForm.current}
                      onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="pw-form-row">
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        placeholder="Min. 6 characters"
                        value={pwForm.next}
                        onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Repeat new password"
                        value={pwForm.confirm}
                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  {pwError   && <div className="form-error">{pwError}</div>}
                  {pwSuccess  && <div className="pw-success">Password updated successfully.</div>}
                  <button type="submit" className="btn btn-primary btn-sm" disabled={pwLoading} style={{ alignSelf: 'flex-start' }}>
                    {pwLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Upload stats */}
        <motion.div className="profile-stats-row" {...fadeUp(3)}>
          <div className="profile-stat">
            <FileText size={16} className="profile-stat-icon" />
            <div className="profile-stat-value">{uploadedCount}</div>
            <div className="profile-stat-label">Uploaded</div>
          </div>
          <div className="profile-stat">
            <CheckCircle size={16} className="profile-stat-icon approved" />
            <div className="profile-stat-value" style={{ color: 'var(--status-approved)' }}>{approvedCount}</div>
            <div className="profile-stat-label">Approved</div>
          </div>
          <div className="profile-stat">
            <Clock size={16} className="profile-stat-icon pending" />
            <div className="profile-stat-value" style={{ color: 'var(--status-pending)' }}>{pendingCount}</div>
            <div className="profile-stat-label">Pending</div>
          </div>
        </motion.div>

        {/* Mod stats */}
        {isMod && modStats && (
          <motion.div className="profile-section" {...fadeUp(5)}>
            <div className="profile-section-title">
              <ShieldCheck size={15} />
              Moderation Activity
            </div>
            <div className="profile-stats-row">
              <div className="profile-stat">
                <div className="profile-stat-value">{modStats.total}</div>
                <div className="profile-stat-label">Reviewed</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ color: 'var(--status-approved)' }}>{modStats.approved}</div>
                <div className="profile-stat-label">Approved</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value" style={{ color: 'var(--status-rejected)' }}>{modStats.rejected}</div>
                <div className="profile-stat-label">Rejected</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Admin section */}
        {isAdmin && (
          <motion.div className="profile-section" {...fadeUp(6)}>
            <div className="profile-section-title">
              <Settings2 size={15} />
              Admin Overview
            </div>
            <div className="profile-stats-row">
              <div className="profile-stat">
                <Users size={16} className="profile-stat-icon" />
                <div className="profile-stat-value">{userCount ?? '—'}</div>
                <div className="profile-stat-label">Total Users</div>
              </div>
              <div className="profile-stat admin-panel-link">
                <Link to="/admin" className="btn btn-ghost btn-sm">Open Admin Panel →</Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Papers table */}
        <motion.div className="papers-table-wrap" {...fadeUp(isMod ? 4 : 3)}>
          <div className="papers-table-header">
            <div className="section-title" style={{ marginBottom: 0 }}>My Papers</div>
            <Link to="/upload" className="btn btn-primary btn-sm">+ Upload New</Link>
          </div>

          {loading ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th><th>Subject</th><th>Year</th><th>Status</th><th>Uploaded</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
                </tbody>
              </table>
            </div>
          ) : papers.length === 0 ? (
            <div className="empty-state">
              No papers yet. <Link to="/upload" style={{ color: 'var(--accent-blue)' }}>Upload one</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map(p => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/paper/${p.id}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {p.title}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.subjects?.name ?? '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.year}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(p.uploaded_at).toLocaleDateString()}
                      </td>
                      <td>
                        {p.status === 'pending' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
