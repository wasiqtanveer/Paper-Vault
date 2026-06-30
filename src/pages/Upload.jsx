import { useEffect, useRef, useState } from 'react';
import { invalidatePapers } from '../lib/cache';
import { motion } from 'framer-motion';
import { FileImage, CheckCircle2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, deleteImage } from '../lib/storage';
import { validateImageSize, compressImage, formatBytes } from '../lib/imageUtils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CustomSelect from '../components/CustomSelect';
import NumberField from '../components/NumberField';
import RequestModal from '../components/RequestModal';
import { Link } from 'react-router-dom';
import { logActivity } from '../lib/activity';
import { teacherLabel } from '../lib/teacherName';
import { buildTitle } from '../lib/paperTitle';
import './Upload.css';

const TERMS      = ['Spring', 'Summer', 'Fall'];
const EXAM_TYPES = ['Mid', 'Final'];

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
  const [success,      setSuccess]      = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const [requestKind,  setRequestKind]  = useState(null); // 'subject' | 'teacher' | null

  useEffect(() => {
    Promise.all([
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('teachers').select('id, name, department').order('name'),
    ]).then(([{ data: s }, { data: t }]) => {
      setSubjects(s ?? []);
      setTeachers(t ?? []);
    });
  }, []);

  // Auto-fill title when fields change (unless user manually edited it)
  useEffect(() => {
    if (titleManual) return;
    setForm(f => ({ ...f, title: buildTitle(f, subjects, teachers) }));
  }, [form.subjectId, form.teacherId, form.year, form.term, form.examType, subjects, teachers, titleManual]);

  function setField(key) {
    return v => setForm(f => ({ ...f, [key]: v }));
  }

  async function processFile(f) {
    if (!f) return;
    setFileError(''); setCompressed(null); setPreview(''); setFile(f);
    try { validateImageSize(f); } catch (err) { setFileError(err.message); return; }
    setCompressing(true);
    try {
      const comp = await compressImage(f);
      setCompressed(comp);
      setPreview(URL.createObjectURL(comp));
    } catch (err) {
      setFileError('Compression failed: ' + err.message);
    } finally {
      setCompressing(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) processFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!compressed)      { setError('Please select an image file.'); return; }
    if (!form.subjectId)  { setError('Please select a subject.'); return; }
    if (!form.examType)   { setError('Please select an exam type.'); return; }
    setLoading(true);
    try {
      const { url, path } = await uploadImage(compressed, user.id);
      const { data: paper, error: dbErr } = await supabase.from('papers').insert({
        title:      form.title || buildTitle(form, subjects, teachers),
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

      setSuccess(true);
      setForm({ subjectId: '', teacherId: '', year: new Date().getFullYear(), term: '', examType: '', title: '' });
      setTitleManual(false);
      setFile(null); setCompressed(null); setPreview('');
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  if (success) return (
    <div className="page-content">
      <div className="topbar"><span style={{ fontSize: 18, fontWeight: 700 }}>Upload Paper</span></div>
      <div className="page-inner">
        <motion.div
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
            <button className="btn btn-primary btn-lg" onClick={() => setSuccess(false)}>Upload another</button>
            <Link to="/profile" className="btn btn-ghost btn-lg">View my papers</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <div className="topbar">
        <span style={{ fontSize: 18, fontWeight: 700 }}>Upload Paper</span>
      </div>

      <div className="page-inner">
        <motion.div
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
                <label className="form-label">Year</label>
                <NumberField
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  min={1990} max={2099} required
                  aria-label="Year"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Term</label>
                <CustomSelect
                  value={form.term}
                  onChange={setField('term')}
                  placeholder="Select term…"
                  options={TERMS.map(t => ({ value: t, label: t }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Exam Type</label>
              <div className="exam-type-row">
                {EXAM_TYPES.map(et => (
                  <button
                    key={et} type="button"
                    className={'exam-type-btn' + (form.examType === et ? ' active' : '')}
                    onClick={() => setForm(f => ({ ...f, examType: et }))}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Title
                {titleManual && (
                  <button type="button" className="title-reset-btn" onClick={() => { setTitleManual(false); }}>
                    Auto-fill
                  </button>
                )}
              </label>
              <input
                value={form.title}
                onChange={e => { setTitleManual(true); setForm(f => ({ ...f, title: e.target.value })); }}
                placeholder="Auto-generated from fields above"
              />
              <div className="form-hint">Filled automatically — edit if needed</div>
            </div>

            <div className="form-group">
              <label className="form-label">Paper Image</label>
              {/* A <label> wrapping a visually-hidden input: click, tap, Enter and
                  Space all open the picker, and screen readers announce it. */}
              <label
                htmlFor="paper-file"
                className={`upload-zone${dragOver ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <FileImage size={28} strokeWidth={1.4} className="upload-zone-icon" aria-hidden="true" />
                <div className="upload-zone-text">{file ? file.name : 'Choose or drag an image here'}</div>
                <div className="upload-zone-sub">JPEG, PNG, WEBP · Max 5MB</div>
                <input id="paper-file" ref={fileInputRef} type="file" accept="image/*" className="sr-only"
                  onChange={e => processFile(e.target.files[0])} />
              </label>
              {fileError && <div className="form-error">{fileError}</div>}
              {compressing && <div className="form-hint">Compressing image…</div>}
              {compressed && !compressing && (
                <div className="upload-preview">
                  <img src={preview} alt="Preview" />
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
              {loading ? 'Uploading…' : 'Submit Paper'}
            </button>
          </form>
        </motion.div>
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
