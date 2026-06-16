/**
 * Build the canonical paper title from its fields:
 * "<Subject> — <Teacher> — <Year> — <Term> — <Exam>", skipping empty parts.
 * Shared by Upload and EditPaperModal so titles can't drift from their fields.
 */
export function buildTitle(form, subjects = [], teachers = []) {
  const sub = subjects.find(s => s.id === form.subjectId)?.name || '';
  const tch = teachers.find(t => t.id === form.teacherId)?.name || '';
  return [sub, tch, form.year, form.term, form.examType].filter(Boolean).join(' — ');
}
