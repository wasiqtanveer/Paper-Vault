import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/storage';
import { validateImageSize, compressImage, formatBytes } from '../lib/imageUtils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CustomSelect from '../components/CustomSelect';
import NumberField from '../components/NumberField';
import './Upload.css';

const TERMS      = ['Spring', 'Summer', 'Fall'];
const EXAM_TYPES = ['Mid', 'Final'];

function buildTitle(form, subjects, teachers) {
  const sub  = subjects.find(s => s.id === form.subjectId)?.name  || '';
  const tch  = teachers.find(t => t.id === form.teacherId)?.name  || '';
  const parts = [sub, tch, form.year, form.term, form.examType].filter(Boolean);
  return parts.join(' — ');
}

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

  useEffect(() => {
    Promise.all([
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('teachers').select('id, name').order('name'),
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
      const url = await uploadImage(compressed, user.id);
      const { data: paper, error: dbErr } = await supabase.from('papers').insert({
        title:      form.title || buildTitle(form, subjects, teachers),
        subject_id: form.subjectId,
        teacher_id: form.teacherId || null,
        year:       Number(form.year),
        semester:   form.term   || null,
        exam_type:  form.examType || null,
        image_url:  url,
        uploader_id: user.id,
        status: 'pending',
      }).select().single();
      if (dbErr) throw dbErr;

      // Log activity
      await supabase.from('activity_log').insert({
        action: 'upload', actor_id: user.id,
        actor_name: profile?.full_name ?? user.email,
        actor_role: profile?.role ?? 'student',
        paper_id: paper.id, paper_title: paper.title,
      });

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
          <div className="upload-success-icon">✓</div>
          <div className="form-title">Submitted!</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '8px 0 24px' }}>
            Your paper is pending review by a moderator.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setSuccess(false)}>Upload Another</button>
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
                <label className="form-label">Subject</label>
                <CustomSelect
                  value={form.subjectId}
                  onChange={setField('subjectId')}
                  placeholder="Select subject…"
                  options={subjects.map(s => ({ value: s.id, label: s.name }))}
                  searchable
                />
              </div>
              <div className="form-group">
                <label className="form-label">Teacher</label>
                <CustomSelect
                  value={form.teacherId}
                  onChange={setField('teacherId')}
                  placeholder="Select teacher…"
                  options={[{ value: '', label: 'Unknown / N/A' }, ...teachers.map(t => ({ value: t.id, label: t.name }))]}
                  searchable
                />
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
              <div
                className={`upload-zone${dragOver ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-zone-icon">📄</div>
                <div className="upload-zone-text">{file ? file.name : 'Click or drag an image here'}</div>
                <div className="upload-zone-sub">JPEG, PNG, WEBP · Max 5MB</div>
                <input ref={fileInputRef} type="file" accept="image/*"
                  onChange={e => processFile(e.target.files[0])} style={{ display: 'none' }} />
              </div>
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

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}
              disabled={loading || compressing}>
              {loading ? 'Uploading…' : 'Submit Paper'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
