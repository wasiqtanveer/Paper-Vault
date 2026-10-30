import { TERMS, EXAM_TYPES } from '../lib/paperOptions';
import { getSubjects, getTeachers } from '../lib/lookups';
import { useEffect, useRef, useState } from 'react';
import { invalidatePapers } from '../lib/cache';
import { m } from 'framer-motion';
import { FileImage, CheckCircle2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, deleteImage } from '../lib/storage';
import { validateImage, compressImage, combineImages, imageLongEdge, formatBytes, MAX_PAGES, STANDARD_EDGE } from '../lib/imageUtils';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import CustomSelect from '../components/CustomSelect';
import NumberField from '../components/NumberField';
import RequestModal from '../components/RequestModal';
import { Link } from 'react-router-dom';
import { logActivity } from '../lib/activity';
import { confirmDialog } from '../lib/confirmDialog';
import { teacherLabel } from '../lib/teacherName';
import { buildTitle } from '../lib/paperTitle';
import './Upload.css';


export default function Upload() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [subjects,    setSubjects]    = useState([]);
  const [teachers,    setTeachers]    = useState([]);
  const [form,        setForm]        = useState({
    subjectId: '', teacherId: '', year: new Date().getFullYear(),
    term: '', examType: '', title: '',
  });
  const [titleManual,  setTitleManual]  = useState(false);
  const [file,         setFile]         = useState(null);
  const [compressed,   setCompressed]   = useState(null);
  const [preview,      setPreview]      = useState('');
  const [compressing,  setCompressing]  = useState(false);
  const [error,        setError]        = useState('');
  const [fileError,    setFileError]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [highQuality,   setHighQuality]   = useState(false); // keep more detail for small print
  const [reduced,       setReduced]       = useState(false); // the photo was larger than the size cap
  const lastFiles = useRef([]);
  const [progress,     setProgress]     = useState(0); // 0..1 while the image uploads
  const [success,      setSuccess]      = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const [requestKind,  setRequestKind]  = useState(null); // 'subject' | 'teacher' | null

  useEffect(() => {
    Promise.all([getSubjects(), getTeachers()]).then(([s, t]) => {
      setSubjects(s);
      setTeachers(t);
    });
  }, []);

  // The title follows the fields until the user edits it. Derived during render
  // rather than synced into state from an effect.
  const title = titleManual ? form.title : buildTitle(form, subjects, teachers);

  function setField(key) {
    return v => setForm(f => ({ ...f, [key]: v }));
  }

  // Object URLs hold the image in memory until revoked; release the old one
  // whenever the preview changes and when the page unmounts.
  const previewRef = useRef('');
  function replacePreview(url) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  }
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  async function processFile(fileOrList, detail = highQuality) {
    const files = Array.from(fileOrList?.length !== undefined && !fileOrList.name ? fileOrList : [fileOrList]).filter(Boolean);
    if (!files.length) return;
    lastFiles.current = files;
    setFileError(''); setCompressed(null); replacePreview('');
    if (files.length > MAX_PAGES) { setFileError(`Choose up to ${MAX_PAGES} pages at once.`); return; }
    const total = files.reduce((n, f) => n + f.size, 0);
    setFile(files.length === 1 ? files[0] : { name: `${files.length} pages`, size: total });
    try { files.forEach(validateImage); } catch (err) { setFileError(err.message); return; }
    setCompressing(true);
    try {
      const source = files.length === 1 ? files[0] : await combineImages(files);
      const comp = await compressImage(source, files.length, { highQuality: detail });
      // Warn when a large photo had to be shrunk, since small print may blur.
      setReduced(!detail && (await imageLongEdge(source)) > STANDARD_EDGE * files.length);
      setCompressed(comp);
      replacePreview(URL.createObjectURL(comp));
    } catch (err) {
      setFileError('Compression failed: ' + err.message);
    } finally {
      setCompressing(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    // Same validation as the file picker, so both paths accept the same files.
    processFile(e.dataTransfer.files);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!compressed)      { setError('Please select an image file.'); return; }
    if (!form.subjectId)  { setError('Please select a subject.'); return; }
    if (!form.examType)   { setError('Please select an exam type.'); return; }
    const year = Number(form.year);
    if (!Number.isInteger(year) || year < 1990 || year > 2099) { setError('Please enter a year between 1990 and 2099.'); return; }
    setLoading(true);
    try {
      // Warn about an existing paper with the same subject, teacher, year, term and exam type.
      // RLS limits this to approved papers plus your own, which is what a student can act on.
      let dup = supabase.from('papers').select('id', { count: 'exact', head: true })
        .eq('subject_id', form.subjectId).eq('year', year).eq('exam_type', form.examType);
      dup = form.teacherId ? dup.eq('teacher_id', form.teacherId) : dup.is('teacher_id', null);
      dup = form.term ? dup.eq('semester', form.term) : dup.is('semester', null);
      const { count: existing } = await dup;
      if (existing > 0) {
        setLoading(false);
        const ok = await confirmDialog({
          title: 'This paper may already exist',
          body: 'A paper with the same subject, teacher, year, term and exam type is already in the library. Upload yours anyway?',
          confirmLabel: 'Upload anyway',
        });
        if (!ok) return;
        setLoading(true);
      }
      const { url, path } = await uploadImage(compressed, user.id, setProgress);
      const { data: paper, error: dbErr } = await supabase.from('papers').insert({
        title:      title || buildTitle(form, subjects, teachers),
        subject_id: form.subjectId,
        teacher_id: form.teacherId || null,
        year:       Number(form.year),
        semester:   form.term   || null,
        exam_type:  form.examType || null,
        image_url:  url,
        image_path: path,
        uploader_id: user.id,
        status: 'pending',
      }).select().single();
      if (dbErr) {
        // Don't leave the file behind when the row couldn't be created.
        await deleteImage(url, path).catch(() => {});
        throw dbErr;
      }
      invalidatePapers();

      // Log activity
      await logActivity({ action: 'upload', user, profile, fallbackRole: 'student', paperId: paper.id, paperTitle: paper.title });

      addToast('Paper uploaded. It will appear once a moderator approves it.', 'success');
      setSuccess(true);
      setForm({ subjectId: '', teacherId: '', year: new Date().getFullYear(), term: '', examType: '', title: '' });
      setTitleManual(false);
      setFile(null); setCompressed(null); replacePreview('');
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  if (success) return (
    <div className="page-content">
      <div className="topbar"><span className="topbar-title">Upload Paper</span></div>
      <div className="page-inner">
        <m.div
          className="form-card upload-success-card"
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.28 }}
        >
          <CheckCircle2 size={40} strokeWidth={1.5} className="upload-success-icon" aria-hidden="true" />
          <div className="form-title">Thanks, it&apos;s in the queue</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '8px 0 24px', lineHeight: 1.5 }}>
            A moderator will review your paper. Once approved it appears in Browse for everyone.
            You can track it on your profile.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setSuccess(false)}>Upload another</button>
            <Link to="/profile" className="btn btn-ghost btn-lg">View my papers</Link>
          </div>
        </m.div>
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <div className="topbar">
        <span className="topbar-title">Upload Paper</span>
      </div>

      <div className="page-inner">
        <m.div
          style={{ maxWidth: 580, margin: '0 auto' }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {error && <div className="inline-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="upload-two-col">
              <div className="form-group">
                <label className="form-label" htmlFor="up-subject">Subject <span className="req" aria-hidden="true">*</span></label>
                <CustomSelect
                  id="up-subject"
                  value={form.subjectId}
                  onChange={setField('subjectId')}
                  placeholder="Select subject…"
                  options={subjects.map(s => ({ value: s.id, label: s.name }))}
                  searchable
                />
                <p className="field-request">
                  Not listed?
                  <button type="button" className="field-request-btn" onClick={() => setRequestKind('subject')}>
                    <Plus size={12} strokeWidth={2.4} aria-hidden="true" /> Request a subject
                  </button>
                </p>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="up-teacher">Teacher</label>
                <CustomSelect
                  id="up-teacher"
                  value={form.teacherId}
                  onChange={setField('teacherId')}
                  placeholder="Select teacher…"
                  options={[{ value: '', label: 'Unknown / N/A' }, ...teachers.map(t => ({ value: t.id, label: teacherLabel(t) }))]}
                  searchable
                />
                <p className="field-request">
                  Not listed?
                  <button type="button" className="field-request-btn" onClick={() => setRequestKind('teacher')}>
                    <Plus size={12} strokeWidth={2.4} aria-hidden="true" /> Request a teacher
                  </button>
                </p>
              </div>
            </div>

            <div className="upload-two-col">
              <div className="form-group">
                <label className="form-label" htmlFor="up-year">Year</label>
                <NumberField
                  id="up-year"
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  min={1990} max={2099} required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="up-term">Term</label>
                <CustomSelect
                  id="up-term"
                  value={form.term}
                  onChange={setField('term')}
                  placeholder="Select term…"
                  options={TERMS.map(t => ({ value: t, label: t }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" id="up-exam-label">Exam Type</label>
              <div className="exam-type-row" role="group" aria-labelledby="up-exam-label">
                {EXAM_TYPES.map(et => (
                  <button
                    key={et} type="button"
                    aria-pressed={form.examType === et}
                    className={'exam-type-btn' + (form.examType === et ? ' active' : '')}
                    onClick={() => setForm(f => ({ ...f, examType: et }))}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="up-title">
                Title
                {titleManual && (
                  <button type="button" className="title-reset-btn" onClick={() => { setTitleManual(false); }}>
                    Auto-fill
                  </button>
                )}
              </label>
              <input
                id="up-title"
                value={title}
                onChange={e => { setTitleManual(true); setForm(f => ({ ...f, title: e.target.value })); }}
                placeholder="Auto-generated from fields above"
              />
              <div className="form-hint">Filled automatically — edit if needed</div>
            </div>

            <div className="form-group">
              <span className="form-label" id="up-image-label">Paper Image</span>
              {/* A <label> wrapping a visually-hidden input: click, tap, Enter and
                  Space all open the picker, and screen readers announce it. */}
              <label
                htmlFor="paper-file"
                aria-labelledby="up-image-label"
                className={`upload-zone${dragOver ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <FileImage size={28} strokeWidth={1.4} className="upload-zone-icon" aria-hidden="true" />
                <div className="upload-zone-text">{file ? file.name : 'Choose or drag the paper image here'}</div>
                <div className="upload-zone-sub">JPEG, PNG, WEBP · Max 5MB each · Up to 4 pages</div>
                <input id="paper-file" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                  onChange={e => processFile(e.target.files)} />
              </label>
              {fileError && <div className="form-error">{fileError}</div>}
              {compressing && <div className="form-hint">Compressing image…</div>}
              {file && !compressing && !fileError && (
                <label className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox" checked={highQuality}
                    style={{ width: 'auto' }}
                    onChange={e => { setHighQuality(e.target.checked); processFile(lastFiles.current, e.target.checked); }}
                  />
                  Keep more detail (larger file). Helps when the paper has small print.
                </label>
              )}
              {reduced && !compressing && !highQuality && (
                <div className="form-hint" role="note">
                  This photo was scaled down to fit the size limit, so small text may be hard to read. Turn on “Keep more detail” if so.
                </div>
              )}
              {compressed && !compressing && (
                <div className="upload-preview">
                  <img src={preview} alt="Preview of the compressed paper image" />
                  <div className="upload-preview-meta">
                    <span>Compressed: {formatBytes(compressed.size)}</span>
                    {file && <span>Original: {formatBytes(file.size)}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Repeat the error beside the button: on a long form the top of the
                page is off-screen when Submit is pressed. */}
            {error && <div className="inline-error" role="alert" style={{ marginBottom: 10 }}>{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}
              disabled={loading || compressing}>
              {loading ? `Uploading… ${progress > 0 && progress < 1 ? Math.round(progress * 100) + '%' : ''}`.trim() : 'Submit Paper'}
            </button>
          </form>
        </m.div>
      </div>
      {requestKind && (
        <RequestModal
          kind={requestKind}
          existing={requestKind === 'subject' ? subjects : teachers}
          onClose={() => setRequestKind(null)}
        />
      )}
    </div>
  );
}
