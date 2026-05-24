import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flag, Trash2, Check, X, ArrowLeft, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteImage } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ImageViewer from '../components/ImageViewer';
import StatusBadge from '../components/StatusBadge';
import './PaperViewer.css';

export default function PaperViewer() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [paper,        setPaper]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showReport,    setShowReport]    = useState(false);
  const [reportReason,  setReportReason]  = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError,   setReportError]   = useState('');
  const [downloading,   setDownloading]   = useState(false);

  useEffect(() => {
    supabase
      .from('papers')
      .select('*, subjects(name), profiles!papers_uploader_id_fkey(full_name, id)')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('Paper not found.');
        else setPaper(data);
        setLoading(false);
      });
  }, [id]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(paper.image_url);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${paper.title.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      addToast('Download failed. Try right-clicking the image.', 'error');
    }
    setDownloading(false);
  }

  async function handleApprove() {
    const { error: err } = await supabase
      .from('papers')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', id);
    if (err) { addToast(err.message, 'error'); return; }
    setPaper(p => ({ ...p, status: 'approved' }));
    addToast('Paper approved.', 'success');
  }

  async function handleReject() {
    const { error: err } = await supabase
      .from('papers')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', id);
    if (err) { addToast(err.message, 'error'); return; }
    setPaper(p => ({ ...p, status: 'rejected' }));
    addToast('Paper rejected.', 'info');
  }

  async function handleDelete() {
    if (!window.confirm('Delete this paper permanently?')) return;
    try { await deleteImage(paper.image_url); } catch (_) {}
    const { error: err } = await supabase.from('papers').delete().eq('id', id);
    if (err) { addToast(err.message, 'error'); return; }
    await supabase.from('activity_log').insert({
      action: 'delete', actor_id: user.id,
      actor_name: profile?.full_name ?? user.email,
      actor_role: profile?.role ?? 'student',
      paper_id: id, paper_title: paper?.title,
    });
    addToast('Paper deleted.', 'success');
    navigate('/profile');
  }

  async function handleReport(e) {
    e.preventDefault();
    setReportError('');
    if (!reportReason.trim()) { setReportError('Please enter a reason.'); return; }
    setReportLoading(true);
    const { error: err } = await supabase.from('reports').insert({
      paper_id: id, reporter_id: user.id, reason: reportReason,
    });
    setReportLoading(false);
    if (err) { setReportError(err.message); return; }
    setShowReport(false); setReportReason('');
    addToast('Report submitted.', 'success');
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;
  if (error)   return (
    <div className="page-content">
      <div className="page-inner"><div className="empty-state">{error}</div></div>
    </div>
  );

  const isMod      = profile?.role === 'moderator' || profile?.role === 'admin';
  const isOwner    = user && paper.profiles?.id === user.id;
  const uploadedAt = new Date(paper.uploaded_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="page-content">
      <div className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="page-inner">
        <div className="paper-viewer-layout">
          <ImageViewer src={paper.image_url} alt={paper.title} />

          <div className="paper-meta-panel">
            <div>
              <div className="paper-meta-title">{paper.title}</div>
              <StatusBadge status={paper.status} />
            </div>

            <div className="divider" style={{ margin: '0' }} />

            <div className="meta-row">
              <span className="meta-label">Subject</span>
              <span className="meta-value">{paper.subjects?.name ?? '—'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Year</span>
              <span className="meta-value">{paper.year}</span>
            </div>
            {paper.semester && (
              <div className="meta-row">
                <span className="meta-label">Semester</span>
                <span className="meta-value">{paper.semester}</span>
              </div>
            )}
            <div className="meta-row">
              <span className="meta-label">Uploaded by</span>
              <span className="meta-value">{paper.profiles?.full_name ?? 'Unknown'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Upload date</span>
              <span className="meta-value">{uploadedAt}</span>
            </div>

            <div className="divider" style={{ margin: '0' }} />

            <div className="meta-actions">
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={downloading}
                style={{ gap: 7 }}
              >
                <Download size={14} /> {downloading ? 'Downloading…' : 'Download'}
              </button>

              {user && !showReport && (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)} style={{ gap: 6 }}>
                  <Flag size={13} /> Report
                </button>
              )}

              {showReport && (
                <form className="report-form" onSubmit={handleReport}>
                  <textarea
                    rows={3}
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Describe the issue…"
                  />
                  {reportError && <div className="form-error">{reportError}</div>}
                  <div className="report-form-actions">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={reportLoading}>
                      {reportLoading ? 'Submitting…' : 'Submit'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReport(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {isOwner && (
                <button className="btn btn-danger btn-sm" onClick={handleDelete} style={{ gap: 6 }}>
                  <Trash2 size={13} /> Delete Paper
                </button>
              )}

              {isMod && paper.status !== 'approved' && (
                <button className="btn-approve" onClick={handleApprove} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Check size={13} /> Approve
                </button>
              )}
              {isMod && paper.status !== 'rejected' && (
                <button className="btn-reject" onClick={handleReject} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <X size={13} /> Reject
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
