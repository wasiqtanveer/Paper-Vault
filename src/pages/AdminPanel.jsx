import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ChevronUp, ArrowUpDown } from 'lucide-react';
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

/** Sortable column header with animated icon */
function SortTh({ col, label, sort, onSort, style }) {
  const active = sort.col === col;
  return (
    <th style={style}>
      <button
        type="button"
        className={'sort-th-btn' + (active ? ' sort-th-active' : '')}
        onClick={() => onSort(col)}
      >
        {label}
        <motion.span
          className="sort-th-icon"
          animate={active ? { rotate: sort.dir === 'asc' ? 0 : 180, opacity: 1 } : { rotate: 0, opacity: 0.4 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          {active ? <ChevronUp size={11} /> : <ArrowUpDown size={11} />}
        </motion.span>
      </button>
    </th>
  );
}

export default function AdminPanel() {
  const { addToast } = useToast();
  const { profile: currentProfile } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSort,   setUserSort]   = useState({ col: 'created_at', dir: 'desc' });
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

  // Hall of Fame state
  const [hofList,   setHofList]   = useState([]);
  const [hofForm,   setHofForm]   = useState({ name: '', role: '', note: '', github: '', linkedin: '', website: '', email: '' });
  const [hofSaving, setHofSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('teachers').select('*').order('name'),
      supabase.from('papers').select('id, status'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('hall_of_fame').select('*').order('created_at', { ascending: true }),
    ]).then(([{ data: u }, { data: s }, { data: t }, { data: p }, { data: log }, { data: hof }]) => {
      setUsers(u ?? []);
      setSubjects(s ?? []);
      setTeachers(t ?? []);
      setActLog(log ?? []);
      setHofList(hof ?? []);
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
    const target = users.find(u => u.id === userId);
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select();
    if (error) { addToast(error.message, 'error'); return; }
    if (!data || data.length === 0) {
      addToast('Update blocked — check RLS policy for profiles table.', 'error');
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    await supabase.from('activity_log').insert({
      action: 'role_change',
      actor_id: currentProfile?.id,
      actor_name: currentProfile?.full_name ?? 'Admin',
      actor_role: currentProfile?.role ?? 'admin',
      paper_id: null,
      paper_title: `${target?.full_name ?? target?.email ?? 'User'} → ${role}`,
    });
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

  // ── Sort helpers ──────────────────────────────────────────────────
  function toggleSort(col) {
    setUserSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
  }

  const filteredUsers = users
    .filter(u =>
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
    .sort((a, b) => {
      const dir = userSort.dir === 'asc' ? 1 : -1;
      const col = userSort.col;
      if (col === 'full_name') return dir * (a.full_name ?? '').localeCompare(b.full_name ?? '');
      if (col === 'email')     return dir * (a.email ?? '').localeCompare(b.email ?? '');
      if (col === 'role')      return dir * (a.role ?? '').localeCompare(b.role ?? '');
      if (col === 'created_at') return dir * (new Date(a.created_at) - new Date(b.created_at));
      return 0;
    });

  function actionLabel(action) {
    const map = { upload: 'Uploaded', approve: 'Approved', reject: 'Rejected', delete: 'Deleted', role_change: 'Role Changed' };
    return map[action] ?? action;
  }
  function actionColor(action) {
    const map = { upload: 'var(--accent-blue)', approve: 'var(--status-approved)', reject: 'var(--status-rejected)', delete: 'var(--status-rejected)', role_change: 'var(--accent-blue)' };
    return map[action] ?? 'var(--text-muted)';
  }

  // ── Hall of Fame helpers ─────────────────────────────────────────────
  function hofFormField(key, placeholder) {
    return (
      <input
        value={hofForm[key]}
        onChange={e => setHofForm(v => ({ ...v, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 120 }}
      />
    );
  }

  async function addToHof() {
    const name = hofForm.name.trim();
    if (!name) { addToast('Name is required.', 'error'); return; }
    setHofSaving(true);
    const payload = {
      name,
      role:     hofForm.role.trim()     || null,
      note:     hofForm.note.trim()     || null,
      github:   hofForm.github.trim()   || null,
      linkedin: hofForm.linkedin.trim() || null,
      website:  hofForm.website.trim()  || null,
      email:    hofForm.email.trim()    || null,
    };
    const { data, error } = await supabase.from('hall_of_fame').insert(payload).select().single();
    if (error) { addToast(error.message, 'error'); setHofSaving(false); return; }
    setHofList(prev => [...prev, data]);
    setHofForm({ name: '', role: '', note: '', github: '', linkedin: '', website: '', email: '' });
    addToast('Contributor added to Hall of Fame!', 'success');
    setHofSaving(false);
  }

  async function removeFromHof(id) {
    if (!window.confirm('Remove this contributor from the Hall of Fame?')) return;
    const { error } = await supabase.from('hall_of_fame').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); return; }
    setHofList(prev => prev.filter(c => c.id !== id));
    addToast('Contributor removed.', 'success');
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
          <div className="table-wrap users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <SortTh col="full_name"  label="Name"   sort={userSort} onSort={toggleSort} style={{ width: '22%' }} />
                  <SortTh col="email"      label="Email"  sort={userSort} onSort={toggleSort} style={{ width: '38%' }} />
                  <SortTh col="role"       label="Role"   sort={userSort} onSort={toggleSort} style={{ width: '20%' }} />
                  <SortTh col="created_at" label="Joined" sort={userSort} onSort={toggleSort} style={{ width: '20%' }} />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filteredUsers.map(u => (
                    <motion.tr
                      key={u.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
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
                    </motion.tr>
                  ))}
                </AnimatePresence>
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
                  const seen = new Map();
                  const groups = new Map();
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

        {/* Hall of Fame */}
        <motion.div className="admin-section" {...fadeUp(4)}>
          <div className="admin-section-header">
            <div className="section-title">Hall of Fame</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hofList.length} contributor{hofList.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="admin-section-body">
            {/* Add contributor form */}
            <div className="hof-admin-form">
              <div className="hof-admin-row">
                <input
                  value={hofForm.name}
                  onChange={e => setHofForm(v => ({ ...v, name: e.target.value }))}
                  placeholder="Full name (required)"
                  style={{ flex: 2 }}
                />
                <input
                  value={hofForm.role}
                  onChange={e => setHofForm(v => ({ ...v, role: e.target.value }))}
                  placeholder="Contribution role (e.g. Bug Reporter)"
                  style={{ flex: 2 }}
                />
              </div>
              <div className="hof-admin-row">
                <input
                  value={hofForm.note}
                  onChange={e => setHofForm(v => ({ ...v, note: e.target.value }))}
                  placeholder="Short note about their contribution (optional)"
                  style={{ flex: 1 }}
                />
              </div>
              <div className="hof-admin-row">
                <input value={hofForm.github}   onChange={e => setHofForm(v => ({ ...v, github:   e.target.value }))} placeholder="GitHub URL"   style={{ flex: 1 }} />
                <input value={hofForm.linkedin}  onChange={e => setHofForm(v => ({ ...v, linkedin: e.target.value }))} placeholder="LinkedIn URL" style={{ flex: 1 }} />
                <input value={hofForm.website}   onChange={e => setHofForm(v => ({ ...v, website:  e.target.value }))} placeholder="Website URL"  style={{ flex: 1 }} />
                <input value={hofForm.email}     onChange={e => setHofForm(v => ({ ...v, email:    e.target.value }))} placeholder="Email"        style={{ flex: 1 }} />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={addToHof}
                disabled={hofSaving}
                style={{ alignSelf: 'flex-start' }}
              >
                {hofSaving ? 'Adding…' : '+ Add to Hall of Fame'}
              </button>
            </div>

            {/* Contributor list */}
            {hofList.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                No contributors yet. Add the first one above.
              </div>
            ) : (
              <div className="table-wrap" style={{ marginTop: 14 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role / Note</th>
                      <th>Socials</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hofList.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{c.name}</td>
                        <td>
                          {c.role && <div style={{ fontSize: 12, color: 'var(--status-pending)', fontWeight: 500 }}>{c.role}</div>}
                          {c.note && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.note}</div>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {c.github   && <a href={c.github}   target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>GitHub</a>}
                            {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>LinkedIn</a>}
                            {c.website  && <a href={c.website}  target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Website</a>}
                            {c.email    && <a href={`mailto:${c.email}`}         style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Email</a>}
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => removeFromHof(c.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
