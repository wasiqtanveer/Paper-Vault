import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ExternalLink, Flag, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import EditPaperModal from '../components/EditPaperModal';
import './ModDashboard.css';

const OWNER_EMAIL = 'mwasiqt@gmail.com';

function ModCardSkeleton() {
  return (
    <div className="mod-paper-card">
      <div className="skel mod-skel-img" />
      <div className="skel mod-skel-line" style={{ width: '85%', marginBottom: 8 }} />
      <div className="skel mod-skel-line" style={{ width: '60%', marginBottom: 16 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skel mod-skel-line" style={{ width: 48 }} />
        <div style={{ display: 'flex', gap: 5 }}>
          <div className="skel" style={{ width: 32, height: 28, borderRadius: 6 }} />
          <div className="skel" style={{ width: 32, height: 28, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

export default function ModDashboard() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const [tab,     setTab]     = useState('pending');
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editingPaper, setEditingPaper] = useState(null); // paper object being edited

  const isSiteOwner = user?.email === OWNER_EMAIL;

  useEffect(() => {
    setLoading(true);
    if (tab === 'pending') {
      supabase
        .from('papers')
        .select('*, subjects(name), profiles!papers_uploader_id_fkey(full_name)')
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false })
        .then(({ data }) => { setPending(data ?? []); setLoading(false); });
    } else {
      supabase
        .from('reports')
        .select('*, papers(id, title, status), profiles!reports_reporter_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .then(({ data }) => { setReports(data ?? []); setLoading(false); });
    }
  }, [tab]);

  // Load subjects/teachers when edit modal is about to open
  useEffect(() => {
    if (!editingPaper) return;
    Promise.all([
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('teachers').select('id, name').order('name'),
    ]).then(([{ data: s }, { data: t }]) => {
      setSubjects(s ?? []);
      setTeachers(t ?? []);
    });
  }, [editingPaper]);

  async function resolveReport(reportId) {
    const { error } = await supabase
      .from('reports')
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', reportId);
    if (error) { addToast(error.message, 'error'); return; }
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, resolved: true } : r));
    addToast('Report marked as resolved.', 'success');
  }

  async function updateStatus(paperId, status) {
    const paper = pending.find(p => p.id === paperId);
    const { error } = await supabase
      .from('papers')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', paperId);
    if (error) { addToast(error.message, 'error'); return; }
    await supabase.from('activity_log').insert({
      action: status, actor_id: user.id,
      actor_name: profile?.full_name ?? user.email,
      actor_role: profile?.role ?? 'moderator',
      paper_id: paperId, paper_title: paper?.title,
    });
    setPending(prev => prev.filter(p => p.id !== paperId));
    addToast(`Paper ${status}.`, status === 'approved' ? 'success' : 'info');
  }

  function handlePaperEdited(updatedPaper) {
    setPending(prev => prev.map(p => p.id === updatedPaper.id ? { ...p, ...updatedPaper } : p));
  }

  const openReports   = reports.filter(r => !r.resolved);
  const closedReports = reports.filter(r => r.resolved);

  return (
    <div className="page-content">
      <div className="topbar">
        <span style={{ fontSize: 18, fontWeight: 700 }}>Moderation</span>
      </div>

      <div className="page-inner">
        <div className="mod-tabs">
          <button className={`tab-btn${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
            Pending
            {pending.length > 0 && <span className="tab-badge">{pending.length}</span>}
          </button>
          <button className={`tab-btn${tab === 'reported' ? ' active' : ''}`} onClick={() => setTab('reported')}>
            Reports
            {tab !== 'reported' && openReports.length > 0 && <span className="tab-badge tab-badge-warn">{openReports.length}</span>}
          </button>
        </div>

        {loading ? (
          <div className="mod-grid">
            {Array.from({ length: 6 }).map((_, i) => <ModCardSkeleton key={i} />)}
          </div>
        ) : tab === 'pending' ? (
          pending.length === 0 ? (
            <div className="empty-state">No pending papers — all caught up.</div>
          ) : (
            <div className="mod-grid">
              {pending.map(p => {
                const date = new Date(p.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={p.id} className="mod-paper-card">
                    {p.image_url && (
                      <Link to={`/paper/${p.id}`}>
                        <img src={p.image_url} alt={p.title} className="mod-paper-thumb" />
                      </Link>
                    )}
                    <div className="mod-paper-title">{p.title}</div>
                    <div className="mod-paper-desc">
                      {p.subjects?.name ?? '—'} · {p.year}{p.profiles?.full_name ? ` · ${p.profiles.full_name}` : ''}
                    </div>
                    <div className="mod-card-footer">
                      <span className="mod-card-date">{date}</span>
                      <div className="mod-card-actions">
                        {isSiteOwner && (
                          <button
                            className="btn-mod-edit"
                            title="Edit paper details"
                            onClick={() => setEditingPaper(p)}
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        <button className="btn-approve" title="Approve" onClick={() => updateStatus(p.id, 'approved')}>
                          <Check size={13} />
                        </button>
                        <button className="btn-reject" title="Reject" onClick={() => updateStatus(p.id, 'rejected')}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          reports.length === 0 ? (
            <div className="empty-state">No reports yet.</div>
          ) : (
            <div className="reports-table-wrap">
              {openReports.length > 0 && (
                <>
                  <div className="reports-section-label">
                    <Flag size={12} /> Open · {openReports.length}
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Paper</th><th>Status</th><th>Reason</th><th>Reporter</th><th>Date</th><th></th></tr>
                      </thead>
                      <tbody>
                        {openReports.map(r => (
                          <tr key={r.id}>
                            <td>
                              {r.papers
                                ? <Link to={`/paper/${r.papers.id}`} className="report-paper-link">
                                    {r.papers.title} <ExternalLink size={11} />
                                  </Link>
                                : '—'}
                            </td>
                            <td>
                              {r.papers?.status
                                ? <span className={`badge-${r.papers.status}`}>{r.papers.status}</span>
                                : '—'}
                            </td>
                            <td className="report-reason">{r.reason}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.profiles?.full_name ?? '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={() => resolveReport(r.id)}>Resolve</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {closedReports.length > 0 && (
                <>
                  <div className="reports-section-label reports-section-label-closed">
                    <Check size={12} /> Resolved · {closedReports.length}
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Paper</th><th>Reason</th><th>Reporter</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {closedReports.map(r => (
                          <tr key={r.id} style={{ opacity: 0.5 }}>
                            <td style={{ color: 'var(--text-muted)' }}>{r.papers?.title ?? '—'}</td>
                            <td className="report-reason">{r.reason}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.profiles?.full_name ?? '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                              {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )
        )}
      </div>

      {editingPaper && (
        <EditPaperModal
          paper={editingPaper}
          subjects={subjects}
          teachers={teachers}
          onSave={handlePaperEdited}
          onClose={() => setEditingPaper(null)}
        />
      )}
    </div>
  );
}
