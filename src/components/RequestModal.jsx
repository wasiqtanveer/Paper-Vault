import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useToast } from '../context/useToast';
import { joinTeacherName, cleanName } from '../lib/teacherName';
import TeacherNameField from './TeacherNameField';
import './EditPaperModal.css';
import './RequestModal.css';

/**
 * Ask an admin to add a missing subject or teacher.
 *
 * Props:
 *  kind      - 'subject' | 'teacher'
 *  existing  - [{ name }] already in the catalogue, used to catch duplicates before a round-trip
 *  onClose   - () => void
 */
export default function RequestModal({ kind, existing = [], onClose }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isTeacher = kind === 'teacher';
  const [title, setTitle] = useState('');
  const [name,  setName]  = useState('');
  const [dept,  setDept]  = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    let finalName;
    if (isTeacher) {
      if (!title) { setError('Choose a title: Mr., Ms., Mrs. or Dr.'); return; }
      finalName = joinTeacherName(title, name);
    } else {
      finalName = cleanName(name);
    }
    const bare = isTeacher ? finalName.slice(title.length).trim() : finalName;
    if (bare.length < 2) {
      setError(`Enter the ${kind}'s ${isTeacher ? 'full name' : 'name'}.`);
      return;
    }
    const department = isTeacher ? cleanName(dept) : null;
    if (isTeacher && department.length < 2) { setError('Choose the teacher\'s department.'); return; }
    if (existing.some(x => x.name.trim().toLowerCase() === finalName.toLowerCase())) {
      setError(`"${finalName}" is already in the list. Pick it from the dropdown.`);
      return;
    }
    setBusy(true);
    const { error: err } = await supabase
      .from('catalog_requests')
      .insert({ kind, name: finalName, department, requested_by: user.id });
    setBusy(false);
    if (err) {
      setError(err.code === '23505'
        ? `"${finalName}" has already been requested and is waiting for review.`
        : err.message);
      return;
    }
    addToast(`Request sent. An admin will review "${finalName}".`, 'success');
    onClose();
  }

  const panelRef = useFocusTrap();

  return (
    <AnimatePresence>
      <m.div
        className="epm-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        onClick={onClose}
      >
        <m.div
          ref={panelRef}
          className="epm-panel rqm-panel"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          role="dialog" aria-modal="true" aria-label={`Request a ${kind}`}
        >
          <div className="epm-header">
            <span className="epm-title">Request a {kind}</span>
            <button className="epm-close" onClick={onClose} type="button" aria-label="Close"><X size={16} /></button>
          </div>
          <form className="epm-body" onSubmit={handleSubmit}>
            <p className="rqm-hint">
              Can&apos;t find your {kind}? Tell us and an admin will add it. You can upload your paper
              as soon as it&apos;s approved.
            </p>
            {error && <div className="inline-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">{isTeacher ? 'Teacher' : 'Subject name'}</label>
              {isTeacher ? (
                <TeacherNameField
                  title={title} name={name} onTitleChange={setTitle} onNameChange={setName}
                  department={dept} onDepartmentChange={setDept}
                  autoFocus
                />
              ) : (
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Data Structures" maxLength={80} autoFocus />
              )}
            </div>
            <div className="epm-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                <Send size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                {busy ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
