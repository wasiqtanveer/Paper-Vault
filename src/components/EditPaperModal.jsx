/**
 * EditPaperModal
 * Lets the owner (or admin) edit a paper's metadata.
 *
 * Props:
 *  paper        – the paper object to edit
 *  subjects     – [{ id, name }]
 *  teachers     – [{ id, name }]
 *  onSave       – (updatedPaper) => void
 *  onClose      – () => void
 */
import { invalidatePapers } from '../lib/cache';
import { teacherLabel } from '../lib/teacherName';
import { buildTitle } from '../lib/paperTitle';
import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/useToast';
import { useFocusTrap } from '../hooks/useFocusTrap';
import CustomSelect from './CustomSelect';
import NumberField from './NumberField';
import './EditPaperModal.css';

const TERMS      = ['Spring', 'Summer', 'Fall'];
const EXAM_TYPES = ['Mid', 'Final'];

export default function EditPaperModal({ paper, subjects, teachers, onSave, onClose }) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const panelRef = useFocusTrap();
  const [form,   setForm]   = useState({
    subjectId: paper.subject_id  ?? '',
    teacherId: paper.teacher_id  ?? '',
    year:      paper.year        ?? new Date().getFullYear(),
    term:      paper.semester    ?? '',
    examType:  paper.exam_type   ?? '',
    title:     paper.title       ?? '',
  });

  // If the stored title still matches its fields it was auto-generated, so keep
  // it in sync as the fields change; a hand-written title is left alone.
  const [titleManual, setTitleManual] = useState(() =>
    paper.title !== buildTitle({
      subjectId: paper.subject_id ?? '', teacherId: paper.teacher_id ?? '',
      year: paper.year, term: paper.semester ?? '', examType: paper.exam_type ?? '',
    }, subjects, teachers));
  const shownTitle = titleManual ? form.title : buildTitle(form, subjects, teachers) || form.title;

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function setField(key) { return v => setForm(f => ({ ...f, [key]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.subjectId) { addToast('Please select a subject.', 'error'); return; }
    setSaving(true);
    const payload = {
      title:      shownTitle.trim() || paper.title,
      subject_id: form.subjectId,
      teacher_id: form.teacherId || null,
      year:       Number(form.year),
      semester:   form.term     || null,
      exam_type:  form.examType || null,
    };
    const { data, error } = await supabase
      .from('papers')
      .update(payload)
      .eq('id', paper.id)
      .select('*, subjects(name), profiles!papers_uploader_id_fkey(full_name, id)')
      .single();
    setSaving(false);
    if (error) { addToast(error.message, 'error'); return; }
    invalidatePapers();
    addToast('Paper updated.', 'success');
    onSave(data);
    onClose();
  }

  return (
    <AnimatePresence>
      <m.div
        className="epm-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      >
        <m.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="epm-title"
          className="epm-panel"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="epm-header">
            <span className="epm-title" id="epm-title">Edit Paper</span>
            <button className="epm-close" onClick={onClose} type="button" aria-label="Close"><X size={16} aria-hidden="true" /></button>
          </div>

          <form className="epm-body" onSubmit={handleSave}>
            <div className="epm-two-col">
              <div className="form-group">
                <label className="form-label" htmlFor="epm-subject">Subject</label>
                <CustomSelect
                  id="epm-subject"
                  value={form.subjectId}
                  onChange={setField('subjectId')}
                  placeholder="Select subject…"
                  options={subjects.map(s => ({ value: s.id, label: s.name }))}
                  searchable
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="epm-teacher">Teacher</label>
                <CustomSelect
                  id="epm-teacher"
                  value={form.teacherId}
                  onChange={setField('teacherId')}
                  placeholder="Unknown / N/A"
                  options={[{ value: '', label: 'Unknown / N/A' }, ...teachers.map(t => ({ value: t.id, label: teacherLabel(t) }))]}
                  searchable
                />
              </div>
            </div>

            <div className="epm-two-col">
              <div className="form-group">
                <label className="form-label" htmlFor="epm-year">Year</label>
                <NumberField
                  id="epm-year"
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  min={1990} max={2099}
                  
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="epm-term">Term</label>
                <CustomSelect
                  id="epm-term"
                  value={form.term}
                  onChange={setField('term')}
                  placeholder="Select term…"
                  options={[{ value: '', label: 'None' }, ...TERMS.map(t => ({ value: t, label: t }))]}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" id="epm-exam-label">Exam Type</label>
              <div className="exam-type-row" role="group" aria-labelledby="epm-exam-label">
                <button
                  type="button"
                  aria-pressed={form.examType === ''}
                  className={'exam-type-btn' + (form.examType === '' ? ' active' : '')}
                  onClick={() => setForm(f => ({ ...f, examType: '' }))}
                >None</button>
                {EXAM_TYPES.map(et => (
                  <button
                    key={et} type="button"
                    aria-pressed={form.examType === et}
                    className={'exam-type-btn' + (form.examType === et ? ' active' : '')}
                    onClick={() => setForm(f => ({ ...f, examType: et }))}
                  >{et}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="epm-title-input">Title</label>
              <input
                id="epm-title-input"
                value={shownTitle}
                onChange={e => { setTitleManual(true); setForm(f => ({ ...f, title: e.target.value })); }}
                placeholder="Paper title…"
              />
            </div>

            <div className="epm-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
