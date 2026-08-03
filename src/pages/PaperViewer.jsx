import { paperAlt } from '../lib/paperTitle';
import { useState } from 'react';
import { invalidatePapers } from '../lib/cache';
import { logActivity } from '../lib/activity';
import { confirmDialog } from '../lib/confirmDialog';
import { cachedSafeQuery } from '../lib/cache';
import { useParams, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { Flag, Trash2, Check, X, ArrowLeft, Download, Pencil } from 'lucide-react';
import { CONTENT_SWAP } from '../lib/motion';
import { supabase } from '../lib/supabase';
import { deleteImage } from '../lib/storage';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import ImageViewer from '../components/ImageViewer';
import StatusBadge from '../components/StatusBadge';
import EditPaperModal from '../components/EditPaperModal';
import RejectReasonForm from '../components/RejectReasonForm';
import { SkeletonLine, SkeletonBlock } from '../components/Skeleton';
import { usePageMeta } from '../lib/usePageMeta';
import { useAsync } from '../hooks/useAsync';
import './PaperViewer.css';

export default function PaperViewer() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [showReport,    setShowReport]    = useState(false);
  const [reportReason,  setReportReason]  = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError,   setReportError]   = useState('');
  const [downloading,   setDownloading]   = useState(false);
  const [showEdit,      setShowEdit]      = useState(false);
  const [editLoading,   setEditLoading]   = useState(false);
  const [showReject,    setShowReject]    = useState(false);
  const [rejectBusy,    setRejectBusy]    = useState(false);
  const [subjects,      setSubjects]      = useState([]);
  const [teachers,      setTeachers]      = useState([]);

  const { data: loaded, error: loadError, loading } = useAsync(async () => {
    let res;
    try {
      res = await supabase
        .from('papers')
        .select('*, subjects(name), teachers(name), profiles!papers_uploader_id_fkey(full_name, id)')
        .eq('id', id)
        .single();
    } catch {
      throw new Error('Could not load this paper. Check your connection and try again.');
    }
    if (res.error || !res.data) throw new Error('Paper not found.');
    return res.data;
  }, id);
  const error = loadError?.message ?? '';

  // Local edits (approve, reject, edit details) layer over the loaded row, keyed by
  // id so navigating to another paper never shows the previous one's edits.
  const [local, setLocal] = useState({ id: null, paper: null });
  const paper = local.id === id ? local.paper : loaded ?? null;
  const setPaper = update => setLocal(prev => {
    const current = prev.id === id ? prev.paper : loaded;
    return { id, paper: typeof update === 'function' ? update(current) : update };
  });

  usePageMeta(paper?.title ?? 'Paper', paper?.title ? `View and download "${paper.title}" on PaperVault.` : undefined);

  // Load subjects/teachers *before* the modal opens so its dropdowns are never empty.
  async function openEdit() {
    setEditLoading(true);
    const [s, t] = await Promise.all([
      cachedSafeQuery('lookup:subjects', () => supabase.from('subjects').select('id, name').order('name'), { fallback: [], ttl: 300_000 }),
      cachedSafeQuery('lookup:teachers', () => supabase.from('teachers').select('id, name, department').order('name'), { fallback: [], ttl: 300_000 }),
    ]);
    setSubjects(s); setTeachers(t);
    setEditLoading(false);
    setShowEdit(true);
  }

  // navigate(-1) would leave the site when the paper was opened from a direct
  // link; React Router's history index is 0 for the first page of a session.
  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/browse');
  }

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
      // iOS Safari and some in-app browsers block blob downloads: open the
      // original instead, where long-press → Save Image works.
      window.open(paper.image_url, '_blank', 'noopener');
      addToast('Opened the full image in a new tab. Save it from there.', 'info');
    }
    setDownloading(false);
  }

  // Puts the paper back exactly as it was before a review action.
  async function undoReview(prev) {
    const { error: err } = await supabase
      .from('papers')
      .update({
        status: prev.status, reviewed_at: prev.reviewed_at ?? null,
        reviewed_by: prev.reviewed_by ?? null, rejection_reason: prev.rejection_reason ?? null,
      })
      .eq('id', id);
    if (err) { addToast(`Couldn't undo: ${err.message}`, 'error'); return; }
    invalidatePapers();
    logActivity({ action: 'restore', user, profile, fallbackRole: 'moderator', paperId: id, paperTitle: prev.title });
    setPaper(p => ({ ...p, ...prev }));
    addToast('Review undone.', 'info');
  }

  async function handleApprove() {
    const before = paper;
    const { error: err } = await supabase
      .from('papers')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id, rejection_reason: null })
      .eq('id', id);
    if (err) { addToast(err.message, 'error'); return; }
    invalidatePapers();
    logActivity({ action: 'approve', user, profile, fallbackRole: 'moderator', paperId: id, paperTitle: paper.title });
    setPaper(p => ({ ...p, status: 'approved', rejection_reason: null }));
    addToast('Paper approved.', 'success', { action: { label: 'Undo', onClick: () => undoReview(before) } });
  }

  async function handleReject(reason) {
    setRejectBusy(true);
    const before = paper;
    const { error: err } = await supabase
      .from('papers')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id, rejection_reason: reason })
      .eq('id', id);
    setRejectBusy(false);
    if (err) { addToast(err.message, 'error'); return; }
    invalidatePapers();
    logActivity({ action: 'reject', user, profile, fallbackRole: 'moderator', paperId: id, paperTitle: paper.title });
    setPaper(p => ({ ...p, status: 'rejected', rejection_reason: reason }));
    setShowReject(false);
    addToast('Paper rejected.', 'info', { action: { label: 'Undo', onClick: () => undoReview(before) } });
  }

  async function handleDelete() {
    const ok = await confirmDialog({
      title: 'Delete this paper?',
      body: `"${paper.title}" and its image will be removed for everyone. This can't be undone.`,
      confirmLabel: 'Delete paper',
    });
    if (!ok) return;
    // Row first: if it fails nothing is lost. Deleting the image first could
    // leave a live paper pointing at a missing file.
    const { data: removed, error: err } = await supabase.from('papers').delete().eq('id', id).select('id');
    if (err) { addToast(err.message, 'error'); return; }
    // RLS filters a forbidden delete to zero rows without raising an error.
    if (!removed?.length) { addToast('Could not delete this paper. You may not have permission.', 'error'); return; }
    deleteImage(paper.image_url, paper.image_path).catch(err => console.warn('[storage] image cleanup failed:', err));
    invalidatePapers();
    await logActivity({ action: 'delete', user, profile, fallbackRole: 'student', paperId: id, paperTitle: paper?.title });
    addToast('Paper deleted.', 'success');
    navigate('/profile');
  }

  async function handleReport(e) {
    e.preventDefault();
    setReportError('');
    const reason = reportReason.trim();
    if (reason.length < 3) { setReportError('Please enter a reason.'); return; }
    if (reason.length > 500) { setReportError('Please keep the reason under 500 characters.'); return; }
    setReportLoading(true);
    const { error: err } = await supabase.from('reports').insert({
      paper_id: id, reporter_id: user.id, reason,
    });
    setReportLoading(false);
    if (err) {
      setReportError(err.code === '23505' ? 'You already have an open report on this paper.' : err.message);
      return;
    }
    setShowReport(false); setReportReason('');
    addToast('Report submitted.', 'success');
  }

  if (loading) return (
    <div className="page-content" aria-busy="true">
      <div className="topbar"><SkeletonLine width={140} height={18} /></div>
      <span className="sr-only" role="status">Loading paper…</span>
      <div className="page-inner">
        <div className="paper-viewer-layout">
          <SkeletonBlock height={420} style={{ aspectRatio: '3 / 4', height: 'auto' }} />
          <div className="paper-meta-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SkeletonLine width="70%" height={20} />
            <SkeletonLine width="30%" height={16} />
            <SkeletonLine width="100%" />
            <SkeletonLine width="90%" />
            <SkeletonLine width="80%" />
            <SkeletonBlock height={40} style={{ marginTop: 'auto' }} />
          </div>
        </div>
      </div>
    </div>
  );
  if (error)   return (
    <div className="page-content">
      <div className="page-inner"><div className="empty-state">{error}</div></div>
    </div>
  );

  const isMod      = profile?.role === 'moderator' || profile?.role === 'admin';
  const isOwner    = user && paper.profiles?.id === user.id;
  // Staff can edit any paper (RLS allows it); gate on role, not an email address.
  const canEdit    = isOwner || isMod;

  const uploadedAt = new Date(paper.uploaded_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    // Fades in over the outgoing skeleton instead of hard-cutting. The early
    // returns above mean skeleton and content never share an AnimatePresence
    // parent, so this is an enter-only fade rather than a true crossfade.
    <m.div className="page-content" initial={CONTENT_SWAP.initial} animate={CONTENT_SWAP.animate}>
      <div className="topbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={14} /> Back
        </button>
        {canEdit && (
          <button type="button"
            className="btn btn-ghost btn-sm"
            onClick={openEdit}
            disabled={editLoading}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Pencil size={13} /> Edit Details
          </button>
        )}
      </div>

      <div className="page-inner">
        <div className="paper-viewer-layout">
          <ImageViewer src={paper.image_url} alt={paperAlt(paper)} />

          <div className="paper-meta-panel">
            <div>
              <div className="paper-meta-title">{paper.title}</div>
              <StatusBadge status={paper.status} />
              {paper.status === 'rejected' && paper.rejection_reason && (isOwner || isMod) && (
                <div className="rejection-note"><strong>Rejected:</strong> {paper.rejection_reason}</div>
              )}
            </div>

            <div className="divider" style={{ margin: '0' }} />

            <div className="meta-row">
              <span className="meta-label">Subject</span>
              <span className="meta-value">{paper.subjects?.name ?? '—'}</span>
            </div>
            {paper.teachers?.name && (
              <div className="meta-row">
                <span className="meta-label">Teacher</span>
                <span className="meta-value">{paper.teachers.name}</span>
              </div>
            )}
            {paper.exam_type && (
              <div className="meta-row">
                <span className="meta-label">Exam</span>
                <span className="meta-value">{paper.exam_type}</span>
              </div>
            )}
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
              {/* The embedded profile is only readable by staff, so non-staff
                  fall through to the name stamped on the paper itself. */}
              <span className="meta-value">{paper.profiles?.full_name ?? paper.uploader_name ?? 'Unknown'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Upload date</span>
              <span className="meta-value">{uploadedAt}</span>
            </div>

            <div className="divider" style={{ margin: '0' }} />

            <div className="meta-actions">
              <button type="button"
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={downloading}
                style={{ gap: 7 }}
              >
                <Download size={14} /> {downloading ? 'Downloading…' : 'Download'}
              </button>

              {user && !showReport && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)} style={{ gap: 6 }}>
                  <Flag size={13} /> Report
                </button>
              )}

              {showReport && (
                <form className="report-form" onSubmit={handleReport}>
                  <textarea
                    rows={3}
                    aria-label="Describe the problem with this paper"
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Describe the issue…"
                    maxLength={500}
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
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} style={{ gap: 6 }}>
                  <Trash2 size={13} /> Delete Paper
                </button>
              )}

              {isMod && paper.status !== 'approved' && (
                <button type="button" className="btn-approve" onClick={handleApprove} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Check size={13} /> Approve
                </button>
              )}
              {isMod && paper.status !== 'rejected' && !showReject && (
                <button type="button" className="btn-reject" onClick={() => setShowReject(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <X size={13} /> Reject
                </button>
              )}
              {showReject && (
                <RejectReasonForm busy={rejectBusy} onConfirm={handleReject} onCancel={() => setShowReject(false)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditPaperModal
          paper={paper}
          subjects={subjects}
          teachers={teachers}
          onSave={updated => setPaper(updated)}
          onClose={() => setShowEdit(false)}
        />
      )}
    </m.div>
  );
}
