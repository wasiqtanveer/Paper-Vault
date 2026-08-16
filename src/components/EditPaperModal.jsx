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
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import CustomSelect from './CustomSelect';
import NumberField from './NumberField';
import './EditPaperModal.css';

const TERMS      = ['Spring', 'Summer', 'Fall'];
const EXAM_TYPES = ['Mid', 'Final'];

export default function EditPaperModal({ paper, subjects, teachers, onSave, onClose }) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form,   setForm]   = useState({
    subjectId: paper.subject_id  ?? '',
    teacherId: paper.teacher_id  ?? '',
    year:      paper.year        ?? new Date().getFullYear(),
    term:      paper.semester    ?? '',
    examType:  paper.exam_type   ?? '',
    title:     paper.title       ?? '',
  });

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
      title:      form.title.trim() || paper.title,
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
    addToast('Paper updated.', 'success');
    onSave(data);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        className="epm-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      >
        <motion.div
          className="epm-panel"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="epm-header">
            <span className="epm-title">Edit Paper</span>
            <button className="epm-close" onClick={onClose} type="button"><X size={16} /></button>
          </div>

          <form className="epm-body" onSubmit={handleSave}>
            <div className="epm-two-col">
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
                  placeholder="Unknown / N/A"
                  options={[{ value: '', label: 'Unknown / N/A' }, ...teachers.map(t => ({ value: t.id, label: t.name }))]}
                  searchable
                />
              </div>
            </div>

            <div className="epm-two-col">
              <div className="form-group">
                <label className="form-label">Year</label>
                <NumberField
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  min={1990} max={2099}
                  aria-label="Year"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Term</label>
                <CustomSelect
                  value={form.term}
                  onChange={setField('term')}
                  placeholder="Select term…"
                  options={[{ value: '', label: 'None' }, ...TERMS.map(t => ({ value: t, label: t }))]}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Exam Type</label>
              <div className="exam-type-row">
                <button
                  type="button"
                  className={'exam-type-btn' + (form.examType === '' ? ' active' : '')}
                  onClick={() => setForm(f => ({ ...f, examType: '' }))}
                >None</button>
                {EXAM_TYPES.map(et => (
                  <button
                    key={et} type="button"
                    className={'exam-type-btn' + (form.examType === et ? ' active' : '')}
                    onClick={() => setForm(f => ({ ...f, examType: et }))}
                  >{et}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
