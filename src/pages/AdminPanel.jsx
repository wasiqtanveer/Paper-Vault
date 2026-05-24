import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
import './AdminPanel.css';

const ROLES = ['student', 'moderator', 'admin'];
const OWNER_EMAIL = 'mwasiqt@gmail.com';

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, delay: i * 0.05, ease: 'easeOut' } },
});

export default function AdminPanel() {
  const { addToast } = useToast();
  const { profile: currentProfile } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [subjects,    setSubjects]    = useState([]);
  const [newSubject,  setNewSubject]  = useState('');
  const [editSubject, setEditSubject] = useState(null); // { id, name }
  const [teachers,    setTeachers]    = useState([]);
  const [newTeacher,  setNewTeacher]  = useState('');
  const [editTeacher, setEditTeacher] = useState(null); // { id, name }
  const [actLog,     setActLog]     = useState([]);
  const [expandedPaper, setExpandedPaper] = useState(null); // paper_id whose row is expanded
  const [stats,      setStats]      = useState({ total: 0, approved: 0, pending: 0, users: 0 });
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('teachers').select('*').order('name'),
      supabase.from('papers').select('id, status'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50),
    ]).then(([{ data: u }, { data: s }, { data: t }, { data: p }, { data: log }]) => {
      setUsers(u ?? []);
      setSubjects(s ?? []);
      setTeachers(t ?? []);
      setActLog(log ?? []);
      const papers = p ?? [];
      setStats({
        total:    papers.length,
        approved: papers.filter(x => x.status === 'approved').length,
        pending:  papers.filter(x => x.status === 'pending').length,
        users:    (u ?? []).length,
      });
      setLoading(false);
    });
  }, []);

  function canEditUser(u) {
    if (u.email === OWNER_EMAIL) return false;
    if (u.id === currentProfile?.id) return false;
    if (u.role === 'admin') return false;
    return true;
  }

  async function updateRole(userId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) { addToast(error.message, 'error'); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    addToast('Role updated.', 'success');
  }

  async function addSubject() {
    const name = newSubject.trim();
    if (!name) return;
    const { data, error } = await supabase.from('subjects').insert({ name }).select().single();
    if (error) { addToast(error.message, 'error'); return; }
    setSubjects(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewSubject('');
    addToast('Subject added.', 'success');
  }

  async function deleteSubject(id) {
    if (!window.confirm('Delete this subject?')) return;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); return; }
    setSubjects(prev => prev.filter(s => s.id !== id));
    addToast('Subject deleted.', 'success');
  }

  async function saveSubject() {
    const name = editSubject.name.trim();
    if (!name) return;
    const { error } = await supabase.from('subjects').update({ name }).eq('id', editSubject.id);
    if (error) { addToast(error.message, 'error'); return; }
    setSubjects(prev => prev.map(s => s.id === editSubject.id ? { ...s, name } : s).sort((a, b) => a.name.localeCompare(b.name)));
    setEditSubject(null);
    addToast('Subject updated.', 'success');
  }

  async function addTeacher() {
    const name = newTeacher.trim();
    if (!name) return;
    const { data, error } = await supabase.from('teachers').insert({ name }).select().single();
    if (error) { addToast(error.message, 'error'); return; }
    setTeachers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTeacher('');
    addToast('Teacher added.', 'success');
  }

  async function deleteTeacher(id) {
    if (!window.confirm('Delete this teacher?')) return;
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); return; }
    setTeachers(prev => prev.filter(t => t.id !== id));
    addToast('Teacher deleted.', 'success');
  }

  async function saveTeacher() {
    const name = editTeacher.name.trim();
    if (!name) return;
    const { error } = await supabase.from('teachers').update({ name }).eq('id', editTeacher.id);
    if (error) { addToast(error.message, 'error'); return; }
    setTeachers(prev => prev.map(t => t.id === editTeacher.id ? { ...t, name } : t).sort((a, b) => a.name.localeCompare(b.name)));
    setEditTeacher(null);
    addToast('Teacher updated.', 'success');
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  function actionLabel(action) {
    const map = { upload: 'Uploaded', approve: 'Approved', reject: 'Rejected', delete: 'Deleted' };
    return map[action] ?? action;
  }
  function actionColor(action) {
    const map = { upload: 'var(--accent-blue)', approve: 'var(--status-approved)', reject: 'var(--status-rejected)', delete: 'var(--status-rejected)' };
    return map[action] ?? 'var(--text-muted)';
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div className="page-content">
      <div className="topbar">
        <span style={{ fontSize: 18, fontWeight: 700 }}>Admin Panel</span>
      </div>

      <div className="page-inner">

        {/* Stats */}
        <motion.div className="metrics-grid" {...fadeUp(0)}>
          {[
            { label: 'Total Papers', value: stats.approved + stats.pending, color: null },
            { label: 'Approved',     value: stats.approved, color: 'var(--status-approved)' },
            { label: 'Pending',      value: stats.pending,  color: 'var(--status-pending)'  },
            { label: 'Total Users',  value: stats.users,   color: null },
          ].map((s, i) => (
            <div className="metric-card" key={i}>
              <div className="metric-label">{s.label}</div>
              <div className="metric-value" style={s.color ? { color: s.color } : {}}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Users */}
        <motion.div className="admin-section" {...fadeUp(1)}>
          <div className="admin-section-header">
            <div className="section-title">Users</div>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users…" style={{ maxWidth: 200 }} />
          </div>
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Name</th>
                  <th style={{ width: '38%' }}>Email</th>
                  <th style={{ width: '20%' }}>Role</th>
                  <th style={{ width: '20%' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.full_name ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, wordBreak: 'break-all' }}>{u.email}</td>
                    <td>
                      {canEditUser(u) ? (
                        <CustomSelect
                          value={u.role}
                          onChange={v => updateRole(u.id, v)}
                          options={ROLES.filter(r => r !== 'admin').map(r => ({ value: r, label: r }))}
                        />
                      ) : (
                        <span className={`role-pill role-pill-${u.email === OWNER_EMAIL ? 'owner' : u.role}`}>
                          {u.email === OWNER_EMAIL ? 'owner' : u.role}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Subjects + Teachers side by side */}
        <motion.div className="admin-two-col" {...fadeUp(2)}>

          {/* Subjects */}
          <div className="admin-section">
            <div className="admin-section-header">
              <div className="section-title">Subjects</div>
            </div>
            <div className="admin-section-body">
              <div className="add-subject-row">
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  placeholder="New subject…" onKeyDown={e => e.key === 'Enter' && addSubject()} />
                <button className="btn btn-primary btn-sm" onClick={addSubject}>Add</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th></th></tr></thead>
                  <tbody>
                    {subjects.map(s => (
                      <tr key={s.id}>
                        <td>
                          {editSubject?.id === s.id ? (
                            <input
                              value={editSubject.name}
                              onChange={e => setEditSubject(v => ({ ...v, name: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveSubject(); if (e.key === 'Escape') setEditSubject(null); }}
                              autoFocus
                              style={{ padding: '4px 8px', fontSize: 13 }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            {editSubject?.id === s.id ? (
                              <>
                                <button className="btn btn-primary btn-sm" onClick={saveSubject}>Save</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditSubject(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditSubject({ id: s.id, name: s.name })}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteSubject(s.id)}>Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Teachers */}
          <div className="admin-section">
            <div className="admin-section-header">
              <div className="section-title">Teachers</div>
            </div>
            <div className="admin-section-body">
              <div className="add-subject-row">
                <input value={newTeacher} onChange={e => setNewTeacher(e.target.value)}
                  placeholder="New teacher…" onKeyDown={e => e.key === 'Enter' && addTeacher()} />
                <button className="btn btn-primary btn-sm" onClick={addTeacher}>Add</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th></th></tr></thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t.id}>
                        <td>
                          {editTeacher?.id === t.id ? (
                            <input
                              value={editTeacher.name}
                              onChange={e => setEditTeacher(v => ({ ...v, name: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveTeacher(); if (e.key === 'Escape') setEditTeacher(null); }}
                              autoFocus
                              style={{ padding: '4px 8px', fontSize: 13 }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            {editTeacher?.id === t.id ? (
                              <>
                                <button className="btn btn-primary btn-sm" onClick={saveTeacher}>Save</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditTeacher(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditTeacher({ id: t.id, name: t.name })}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteTeacher(t.id)}>Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Activity Log — grouped by paper, expandable */}
        <motion.div className="admin-section" {...fadeUp(3)}>
          <div className="admin-section-header">
            <div className="section-title">Activity Log</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 50 actions · click a row to expand</span>
          </div>
          <div className="table-wrap">
            <table className="activity-table">
              <colgroup>
                <col style={{ width: 28 }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '10%' }} />
                <col />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th></th>
                  <th>Action</th>
                  <th>By</th>
                  <th>Role</th>
                  <th>Paper</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {actLog.length === 0 ? (
                  <tr><td colSpan={6} className="act-empty">No activity yet</td></tr>
                ) : (() => {
                  // Group by paper_id, preserving most-recent-first order
                  const seen = new Map(); // paper_id → first (most recent) log entry
                  const groups = new Map(); // paper_id → all entries for that paper
                  actLog.forEach(log => {
                    const key = log.paper_id ?? log.id;
                    if (!seen.has(key)) seen.set(key, log);
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key).push(log);
                  });
                  const rows = [];
                  seen.forEach((primary, key) => {
                    const history = groups.get(key);
                    const isOpen = expandedPaper === key;
                    rows.push(
                      <tr
                        key={key}
                        className={'act-row' + (isOpen ? ' act-row-open' : '')}
                        onClick={() => setExpandedPaper(isOpen ? null : key)}
                      >
                        <td className="act-chevron-cell">
                          {history.length > 1
                            ? isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />
                            : null}
                        </td>
                        <td>
                          <span className="act-badge" style={{ color: actionColor(primary.action), background: actionColor(primary.action) + '18', border: `1px solid ${actionColor(primary.action)}33` }}>
                            {actionLabel(primary.action)}
                          </span>
                        </td>
                        <td className="act-cell-name">{primary.actor_name ?? '—'}</td>
                        <td>
                          {primary.actor_role
                            ? <span className={`role-pill role-pill-${primary.actor_role}`} style={{ height: 22, fontSize: 11 }}>{primary.actor_role}</span>
                            : <span className="act-muted">—</span>}
                        </td>
                        <td className="act-cell-paper">{primary.paper_title ?? '—'}</td>
                        <td className="act-cell-when">
                          {new Date(primary.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                    if (isOpen && history.length > 1) {
                      rows.push(
                        <tr key={key + '-expand'} className="act-expand-row">
                          <td colSpan={6} className="act-expand-cell">
                            <AnimatePresence>
                              <motion.div
                                className="act-history"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                              >
                                <div className="act-history-label">Full paper history</div>
                                {history.map((h, i) => (
                                  <div key={h.id} className="act-history-row">
                                    <span className="act-history-step">{i + 1}</span>
                                    <span className="act-badge" style={{ color: actionColor(h.action), background: actionColor(h.action) + '18', border: `1px solid ${actionColor(h.action)}33`, fontSize: 11 }}>
                                      {actionLabel(h.action)}
                                    </span>
                                    <span className="act-history-by">
                                      {h.actor_name ?? '—'}
                                      {h.actor_role && <span className={`role-pill role-pill-${h.actor_role}`} style={{ height: 18, fontSize: 10, marginLeft: 6 }}>{h.actor_role}</span>}
                                    </span>
                                    <span className="act-history-when">
                                      {new Date(h.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                ))}
                              </motion.div>
                            </AnimatePresence>
                          </td>
                        </tr>
                      );
                    }
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
