import { SUBJECTS_KEY, TEACHERS_KEY } from '../lib/lookups';
import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ChevronUp, ArrowUpDown, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { safeQuery, countRows } from '../lib/query';
import { invalidate } from '../lib/cache';
import { logActivity } from '../lib/activity';
import { CONTACT } from '../lib/contact';
import { joinTeacherName, splitTeacherName, cleanName } from '../lib/teacherName';
import TeacherNameField from '../components/TeacherNameField';
import { confirmDialog } from '../lib/confirmDialog';
import AdminFormModal from '../components/AdminFormModal';
import { useToast } from '../context/useToast';
import { useAuth } from '../context/useAuth';
import CustomSelect from '../components/CustomSelect';
import { SkeletonRow, SkeletonBlock } from '../components/Skeleton';
import './AdminPanel.css';

const ROLES = ['student', 'moderator', 'admin'];
const OWNER_EMAIL = CONTACT.email;
const USERS_PAGE_SIZE = 25;

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
        <m.span
          className="sort-th-icon"
          animate={active ? { rotate: sort.dir === 'asc' ? 0 : 180, opacity: 1 } : { rotate: 0, opacity: 0.4 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          {active ? <ChevronUp size={11} /> : <ArrowUpDown size={11} />}
        </m.span>
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
  const [userLimit,  setUserLimit]  = useState(USERS_PAGE_SIZE);
  const [subjects,    setSubjects]    = useState([]);
  const [newSubject,  setNewSubject]  = useState('');
  const [editSubject, setEditSubject] = useState(null); // { id, name }
  const [teachers,    setTeachers]    = useState([]);
  const [newTeacher,  setNewTeacher]  = useState('');
  const [newTitle,    setNewTitle]    = useState('');
  const [newDept,     setNewDept]     = useState('');
  const [editTeacher, setEditTeacher] = useState(null); // { id, title, name }
  const [requests,    setRequests]    = useState([]); // pending subject/teacher requests
  const [adding,      setAdding]      = useState(null); // 'subject' | 'teacher' | 'hof' | null
  const [saving,      setSaving]      = useState(false);
  const [actLog,     setActLog]     = useState([]);
  const [expandedPaper, setExpandedPaper] = useState(null); // paper_id whose row is expanded
  const [stats,      setStats]      = useState({ total: 0, approved: 0, pending: 0, users: 0 });
  const [loading,    setLoading]    = useState(true);

  // Hall of Fame state
  const [hofList,   setHofList]   = useState([]);
  const [hofForm,   setHofForm]   = useState({ name: '', role: '', note: '', github: '', linkedin: '', website: '', email: '' });

  useEffect(() => {
    const onError = msg => addToast(msg, 'error');
    Promise.all([
      safeQuery(supabase.from('profiles').select('*').order('created_at', { ascending: false }), { fallback: [], onError, label: 'users' }),
      safeQuery(supabase.from('subjects').select('*').order('name'), { fallback: [], onError, label: 'subjects' }),
      safeQuery(supabase.from('teachers').select('*').order('name'), { fallback: [], onError, label: 'teachers' }),
      Promise.all(['approved', 'pending'].map(st =>
        countRows(supabase.from('papers').select('id', { count: 'exact', head: true }).eq('status', st)),
      )).then(([approved, pending]) => ({ approved, pending })).catch(() => { onError('Failed to load paper stats.'); return { approved: 0, pending: 0 }; }),
      safeQuery(supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50), { fallback: [], onError, label: 'activity log' }),
      safeQuery(supabase.from('hall_of_fame').select('*').order('created_at', { ascending: true }), { fallback: [], onError, label: 'hall of fame' }),
      // Silent on failure: the table only exists once supabase_catalog_requests.sql has been run.
      safeQuery(supabase.from('catalog_requests').select('*').eq('status', 'pending').order('created_at', { ascending: true }), { fallback: [], onError: msg => console.warn(msg), label: 'requests' }),
    ]).then(([u, s, t, p, log, hof, reqs]) => {
      setRequests(reqs);
      setUsers(u);
      setSubjects(s);
      setTeachers(t);
      setActLog(log);
      setHofList(hof);
      setStats({
        total:    p.approved + p.pending,
        approved: p.approved,
        pending:  p.pending,
        users:    u.length,
      });
      setLoading(false);
    });
  }, [addToast]);

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
    await logActivity({
      action: 'role_change',
      user: { id: currentProfile?.id },
      profile: currentProfile,
      fallbackRole: 'admin',
      paperTitle: `${target?.full_name ?? target?.email ?? 'User'} → ${role}`,
    });
    addToast('Role updated.', 'success');
  }

  async function addSubject() {
    const name = cleanName(newSubject);
    if (!name) { addToast('Enter a subject name.', 'error'); return false; }
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) { addToast('That subject already exists.', 'error'); return false; }
    const { data, error } = await supabase.from('subjects').insert({ name }).select().single();
    if (error) { addToast(error.message, 'error'); return false; }
    invalidateLookups();
    setSubjects(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewSubject('');
    addToast('Subject added.', 'success');
    record('subject_add', name);
    return true;
  }

  async function deleteSubject(id) {
    const name = subjects.find(s => s.id === id)?.name ?? 'this subject';
    if (!(await confirmDialog({ title: 'Delete subject?', body: `"${name}" will be removed from every dropdown.`, confirmLabel: 'Delete subject' }))) return;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); return; }
    invalidateLookups();
    setSubjects(prev => prev.filter(s => s.id !== id));
    addToast('Subject deleted.', 'success');
    record('subject_delete', name);
  }

  async function saveSubject() {
    const name = editSubject.name.trim();
    if (!name) return;
    const { error } = await supabase.from('subjects').update({ name }).eq('id', editSubject.id);
    if (error) { addToast(error.message, 'error'); return; }
    invalidateLookups();
    setSubjects(prev => prev.map(s => s.id === editSubject.id ? { ...s, name } : s).sort((a, b) => a.name.localeCompare(b.name)));
    setEditSubject(null);
    addToast('Subject updated.', 'success');
  }

  async function addTeacher() {
    if (!newTitle) { addToast('Choose a title (Mr., Ms., Mrs. or Dr.).', 'error'); return false; }
    const name = joinTeacherName(newTitle, newTeacher);
    if (!name) { addToast("Enter the teacher's name.", 'error'); return false; }
    const department = cleanName(newDept);
    if (department.length < 2) { addToast("Choose the teacher's department.", 'error'); return false; }
    if (teachers.some(t => t.name.toLowerCase() === name.toLowerCase())) { addToast('That teacher already exists.', 'error'); return false; }
    const { data, error } = await supabase.from('teachers').insert({ name, department }).select().single();
    if (error) { addToast(error.message, 'error'); return false; }
    invalidateLookups();
    setTeachers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTeacher('');
    setNewTitle('');
    setNewDept('');
    addToast('Teacher added.', 'success');
    record('teacher_add', `${name} · ${department}`);
    return true;
  }

  async function deleteTeacher(id) {
    const name = teachers.find(t => t.id === id)?.name ?? 'this teacher';
    if (!(await confirmDialog({ title: 'Delete teacher?', body: `"${name}" will be removed from every dropdown.`, confirmLabel: 'Delete teacher' }))) return;
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); return; }
    invalidateLookups();
    setTeachers(prev => prev.filter(t => t.id !== id));
    addToast('Teacher deleted.', 'success');
    record('teacher_delete', name);
  }

  async function saveTeacher() {
    if (!editTeacher.title) { addToast('Choose a title (Mr., Ms., Mrs. or Dr.).', 'error'); return; }
    const name = joinTeacherName(editTeacher.title, editTeacher.name);
    if (!name) return;
    const department = cleanName(editTeacher.department ?? '') || null;
    const { error } = await supabase.from('teachers').update({ name, department }).eq('id', editTeacher.id);
    if (error) { addToast(error.message, 'error'); return; }
    invalidateLookups();
    setTeachers(prev => prev.map(t => t.id === editTeacher.id ? { ...t, name, department } : t).sort((a, b) => a.name.localeCompare(b.name)));
    setEditTeacher(null);
    addToast('Teacher updated.', 'success');
  }

  // Subjects/teachers feed cached dropdowns on Browse, the viewer and the edit modal.
  function invalidateLookups() {
    [SUBJECTS_KEY, TEACHERS_KEY].forEach(k => invalidate(k));
  }

  const requesterName = id => {
    const u = users.find(x => x.id === id);
    return u?.full_name ?? u?.email ?? 'Unknown';
  };

  async function reviewRequest(r, approve) {
    if (approve) {
      const table = r.kind === 'subject' ? 'subjects' : 'teachers';
      const list  = r.kind === 'subject' ? subjects : teachers;
      // The name may already exist (added by hand since the request): skip the insert, still close the request.
      if (!list.some(x => x.name.toLowerCase() === r.name.toLowerCase())) {
        const row = r.kind === 'teacher' ? { name: r.name, department: r.department ?? null } : { name: r.name };
        const { data, error } = await supabase.from(table).insert(row).select().single();
        if (error) { addToast(error.message, 'error'); return; }
        const setList = r.kind === 'subject' ? setSubjects : setTeachers;
        setList(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        invalidateLookups();
      }
    }
    const { error } = await supabase.from('catalog_requests')
      .update({ status: approve ? 'approved' : 'rejected', reviewed_by: currentProfile?.id, reviewed_at: new Date().toISOString() })
      .eq('id', r.id);
    if (error) { addToast(error.message, 'error'); return; }
    setRequests(prev => prev.filter(x => x.id !== r.id));
    addToast(approve ? `Added "${r.name}".` : 'Request declined.', approve ? 'success' : 'info');
    record(approve ? 'request_approve' : 'request_decline', `${r.kind === 'subject' ? 'Subject' : 'Teacher'}: ${r.name}`);
  }

  // ── Sort helpers ──────────────────────────────────────────────────
  function toggleSort(col) {
    setUserLimit(USERS_PAGE_SIZE); // reset paging when re-sorting
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

  // Cap rendered rows so the table doesn't mount thousands of DOM nodes at once.
  const visibleUsers = filteredUsers.slice(0, userLimit);
  const hasMoreUsers = filteredUsers.length > userLimit;

  /**
   * Log an admin action and show it in the Activity Log right away. The log is
   * loaded once with the page, so without the local prepend the admin's own
   * actions would only appear after a reload, which reads as "broken".
   */
  function record(action, details) {
    logActivity({ action, user: { id: currentProfile?.id }, profile: currentProfile, fallbackRole: 'admin', paperTitle: details });
    setActLog(prev => [{
      id: `local-${Date.now()}-${Math.random()}`,
      action,
      actor_name: currentProfile?.full_name ?? 'You',
      actor_role: currentProfile?.role ?? 'admin',
      paper_id: null,
      paper_title: details,
      created_at: new Date().toISOString(),
    }, ...prev].slice(0, 50));
  }

  const ACTIONS = {
    upload:          ['Uploaded',         'var(--accent-blue)'],
    approve:         ['Approved',         'var(--status-approved)'],
    approved:        ['Approved',         'var(--status-approved)'],
    reject:          ['Rejected',         'var(--status-rejected)'],
    rejected:        ['Rejected',         'var(--status-rejected)'],
    restore:         ['Back to pending',  'var(--status-pending)'],
    delete:          ['Deleted',          'var(--status-rejected)'],
    role_change:     ['Role changed',     'var(--accent-blue)'],
    subject_add:     ['Subject added',    'var(--status-approved)'],
    subject_delete:  ['Subject removed',  'var(--status-rejected)'],
    teacher_add:     ['Teacher added',    'var(--status-approved)'],
    teacher_delete:  ['Teacher removed',  'var(--status-rejected)'],
    request_approve: ['Request approved', 'var(--status-approved)'],
    request_decline: ['Request declined', 'var(--status-rejected)'],
    hof_add:         ['Hall of Fame +',   'var(--accent-amber)'],
    hof_remove:      ['Hall of Fame −',   'var(--status-rejected)'],
  };
  const actionLabel = action => ACTIONS[action]?.[0] ?? action;
  const actionColor = action => ACTIONS[action]?.[1] ?? 'var(--text-muted)';

  // ── Hall of Fame helpers ─────────────────────────────────────────────
  // A bare "github.com/x" would render as a relative link on the Hall of Fame page.
  const normalizeUrl = v => {
    const t = v.trim();
    if (!t) return null;
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  };

  async function addToHof() {
    const name = hofForm.name.trim();
    if (!name) { addToast('Name is required.', 'error'); return false; }
    const email = hofForm.email.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { addToast('That email address looks invalid.', 'error'); return false; }
    const payload = {
      name,
      role:     hofForm.role.trim()     || null,
      note:     hofForm.note.trim()     || null,
      github:   normalizeUrl(hofForm.github),
      linkedin: normalizeUrl(hofForm.linkedin),
      website:  normalizeUrl(hofForm.website),
      email:    email || null,
    };
    const { data, error } = await supabase.from('hall_of_fame').insert(payload).select().single();
    if (error) { addToast(error.message, 'error'); return false; }
    setHofList(prev => [...prev, data]);
    setHofForm({ name: '', role: '', note: '', github: '', linkedin: '', website: '', email: '' });
    addToast('Contributor added to Hall of Fame.', 'success');
    record('hof_add', name);
    return true;
  }

  // Runs an add* function from a pop-up and closes it only when it succeeded,
  // so a validation error keeps what was typed.
  async function runAdd(fn) {
    setSaving(true);
    const ok = await fn();
    setSaving(false);
    if (ok) setAdding(null);
  }

  async function removeFromHof(id) {
    const name = hofList.find(c => c.id === id)?.name ?? 'this contributor';
    if (!(await confirmDialog({ title: 'Remove from Hall of Fame?', body: `"${name}" will no longer be listed.`, confirmLabel: 'Remove' }))) return;
    const { error } = await supabase.from('hall_of_fame').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); return; }
    setHofList(prev => prev.filter(c => c.id !== id));
    addToast('Contributor removed.', 'success');
    record('hof_remove', name);
  }

  if (loading) return (
    <div className="page-content">
      <div className="topbar"><span style={{ fontSize: 18, fontWeight: 700 }}>Admin Panel</span></div>
      <div className="page-inner">
        <div className="metrics-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="metric-card" key={i}><SkeletonBlock height={48} /></div>
          ))}
        </div>
        <div className="admin-section">
          <div className="admin-section-header"><div className="section-title">Users</div></div>
          <div className="table-wrap">
            <table className="users-table">
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <div className="topbar">
        <span style={{ fontSize: 18, fontWeight: 700 }}>Admin Panel</span>
      </div>

      <div className="page-inner">

        {/* Stats */}
        <m.div className="metrics-grid" {...fadeUp(0)}>
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
        </m.div>

        {/* Users */}
        <m.div className="admin-section" {...fadeUp(1)}>
          <div className="admin-section-header">
            <div className="section-title">Users</div>
            <input value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserLimit(USERS_PAGE_SIZE); }} placeholder="Search users…" style={{ maxWidth: 200 }} />
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
                  {visibleUsers.map(u => (
                    <m.tr
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
                    </m.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {hasMoreUsers && (
              <div className="load-more-wrap">
                <button type="button" className="btn btn-ghost" onClick={() => setUserLimit(l => l + USERS_PAGE_SIZE)}>
                  Show more ({filteredUsers.length - userLimit} more)
                </button>
              </div>
            )}
          </div>
        </m.div>

        {/* Requests from students for missing subjects / teachers */}
        <m.div className="admin-section" {...fadeUp(2)}>
          <div className="admin-section-header">
            <div className="section-title">Subject &amp; Teacher Requests</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{requests.length} pending</span>
          </div>
          {requests.length === 0 ? (
            <div className="act-empty" style={{ padding: '22px 20px' }}>No pending requests.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Name</th><th>Requested by</th><th>When</th><th></th></tr></thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td><span className="act-badge" style={{ color: 'var(--accent-blue)', background: 'var(--accent-blue)18', border: '1px solid var(--accent-blue)33' }}>{r.kind === 'subject' ? 'Subject' : 'Teacher'}</span></td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {r.name}
                        {r.department && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{r.department}</div>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{requesterName(r.requested_by)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => reviewRequest(r, true)}>Approve</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => reviewRequest(r, false)}>Decline</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </m.div>

        {/* Subjects + Teachers side by side */}
        <m.div className="admin-two-col" {...fadeUp(2)}>

          {/* Subjects */}
          <div className="admin-section">
            <div className="admin-section-header">
              <div className="section-title">Subjects <span className="admin-count">{subjects.length}</span></div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding('subject')}>
                <Plus size={13} aria-hidden="true" /> Add subject
              </button>
            </div>
            <div className="admin-section-body">
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
                                <button type="button" className="btn btn-primary btn-sm" onClick={saveSubject}>Save</button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditSubject(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditSubject({ id: s.id, name: s.name })}>Edit</button>
                                <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteSubject(s.id)}>Delete</button>
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
              <div className="section-title">Teachers <span className="admin-count">{teachers.length}</span></div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding('teacher')}>
                <Plus size={13} aria-hidden="true" /> Add teacher
              </button>
            </div>
            <div className="admin-section-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th></th></tr></thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t.id}>
                        <td>
                          {editTeacher?.id === t.id ? (
                            <TeacherNameField
                              title={editTeacher.title} name={editTeacher.name}
                              onTitleChange={v => setEditTeacher(e => ({ ...e, title: v }))}
                              onNameChange={v => setEditTeacher(e => ({ ...e, name: v }))}
                              department={editTeacher.department} onDepartmentChange={v => setEditTeacher(e => ({ ...e, department: v }))}
                             
                              onKeyDown={e => { if (e.key === 'Enter') saveTeacher(); if (e.key === 'Escape') setEditTeacher(null); }}
                              autoFocus compact
                            />
                          ) : (
                            <>
                              <span style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                              {t.department
                                ? <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{t.department}</div>
                                : <div style={{ fontSize: 11.5, color: 'var(--status-pending)', marginTop: 2 }}>No department</div>}
                            </>
                          )}
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            {editTeacher?.id === t.id ? (
                              <>
                                <button type="button" className="btn btn-primary btn-sm" onClick={saveTeacher}>Save</button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditTeacher(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const { title, rest } = splitTeacherName(t.name); setEditTeacher({ id: t.id, title, name: rest, department: t.department ?? '' }); }}>Edit</button>
                                <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteTeacher(t.id)}>Delete</button>
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
        </m.div>

        {/* Activity Log — grouped by paper, expandable */}
        <m.div className="admin-section" {...fadeUp(3)}>
          <div className="admin-section-header">
            <div className="section-title">Activity Log</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 50 actions · click a row with an arrow to see its history</span>
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
                  <th>Details</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {actLog.length === 0 ? (
                  <tr><td colSpan={6} className="act-empty">No activity yet. Uploads, reviews and admin changes will appear here.</td></tr>
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
                              <m.div
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
                              </m.div>
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
        </m.div>

        {/* Hall of Fame */}
        <m.div className="admin-section" {...fadeUp(4)}>
          <div className="admin-section-header">
            <div className="section-title">Hall of Fame <span className="admin-count">{hofList.length}</span></div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding('hof')}>
              <Plus size={13} aria-hidden="true" /> Add contributor
            </button>
          </div>
          <div className="admin-section-body">
            {/* Contributor list */}
            {hofList.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                No contributors yet. Use Add contributor to list the first one.
              </div>
            ) : (
              <div className="table-wrap">
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
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeFromHof(c.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </m.div>

      </div>

      <AnimatePresence>
        {adding === 'subject' && (
          <AdminFormModal key="add-subject" title="Add subject" submitLabel="Add subject" busy={saving}
            onClose={() => setAdding(null)} onSubmit={() => runAdd(addSubject)}>
            <div className="form-group" style={{ marginBottom: 4 }}>
              <label className="form-label" htmlFor="new-subject">Subject name</label>
              <input id="new-subject" value={newSubject} onChange={e => setNewSubject(e.target.value)}
                placeholder="e.g. Theory of Automata" maxLength={80} autoFocus />
            </div>
          </AdminFormModal>
        )}
        {adding === 'teacher' && (
          <AdminFormModal key="add-teacher" title="Add teacher" submitLabel="Add teacher" busy={saving}
            onClose={() => setAdding(null)} onSubmit={() => runAdd(addTeacher)}>
            <div className="form-group" style={{ marginBottom: 4 }}>
              <label className="form-label">Teacher</label>
              <TeacherNameField
                title={newTitle} name={newTeacher}
                onTitleChange={setNewTitle} onNameChange={setNewTeacher}
                department={newDept} onDepartmentChange={setNewDept}
                autoFocus
              />
            </div>
          </AdminFormModal>
        )}
        {adding === 'hof' && (
          <AdminFormModal key="add-hof" title="Add to Hall of Fame" submitLabel="Add contributor" busy={saving} width={520}
            onClose={() => setAdding(null)} onSubmit={() => runAdd(addToHof)}>
            <div className="form-group">
              <label className="form-label" htmlFor="hof-name">Full name <span className="req" aria-hidden="true">*</span></label>
              <input id="hof-name" value={hofForm.name} onChange={e => setHofForm(v => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Rafi Ullah" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hof-role">Contribution</label>
              <input id="hof-role" value={hofForm.role} onChange={e => setHofForm(v => ({ ...v, role: e.target.value }))}
                placeholder="e.g. Bug Reporter" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hof-note">Note</label>
              <input id="hof-note" value={hofForm.note} onChange={e => setHofForm(v => ({ ...v, note: e.target.value }))}
                placeholder="What they did, in one line" />
            </div>
            <div className="form-group" style={{ marginBottom: 4 }}>
              <label className="form-label">Links <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <div className="epm-two-col">
                <input value={hofForm.github} onChange={e => setHofForm(v => ({ ...v, github: e.target.value }))} placeholder="GitHub" aria-label="GitHub" />
                <input value={hofForm.linkedin} onChange={e => setHofForm(v => ({ ...v, linkedin: e.target.value }))} placeholder="LinkedIn" aria-label="LinkedIn" />
                <input value={hofForm.website} onChange={e => setHofForm(v => ({ ...v, website: e.target.value }))} placeholder="Website" aria-label="Website" />
                <input value={hofForm.email} onChange={e => setHofForm(v => ({ ...v, email: e.target.value }))} placeholder="Email" aria-label="Email" />
              </div>
            </div>
          </AdminFormModal>
        )}
      </AnimatePresence>
    </div>
  );
}
