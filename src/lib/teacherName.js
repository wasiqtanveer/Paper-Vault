/**
 * Teacher names are stored as one display string with the title baked in
 * ("Dr. Ahmed Khan"), so every place that already renders `teachers.name`
 * keeps working and the title can never be separated from the person.
 */
export const TEACHER_TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.'];

// Also recognises the informal forms older rows were entered with, so editing
// "Sir Abrar" pre-selects Mr. instead of leaving the title blank.
const TITLE_RE = /^(mr|mrs|ms|dr|sir|miss|ma'?am|madam)\.?\s+/i;
const ALIASES = { sir: 'Mr.', miss: 'Ms.', maam: 'Ms.', "ma'am": 'Ms.', madam: 'Ms.' };

/** Normalise "dr ahmed" / "DR. ahmed" -> { title: 'Dr.', rest: 'ahmed' }. title is '' if absent. */
export function splitTeacherName(name = '') {
  const trimmed = name.trim();
  const m = trimmed.match(TITLE_RE);
  if (!m) return { title: '', rest: trimmed };
  const key = m[1].toLowerCase();
  const title = ALIASES[key] ?? TEACHER_TITLES.find(t => t.toLowerCase().replace('.', '') === key) ?? '';
  return { title, rest: trimmed.slice(m[0].length).trim() };
}

/** Combine a title and a name into the stored form, collapsing stray spaces and any title typed into the name. */
export function joinTeacherName(title, rest) {
  const clean = splitTeacherName(rest).rest.replace(/\s+/g, ' ');
  return clean ? `${title} ${clean}` : '';
}

/** Collapse whitespace for free-text names (subjects). */
export function cleanName(name = '') {
  return name.replace(/\s+/g, ' ').trim();
}

/** Dropdown label: "Dr. Rabia Khan · Physics", or just the name when no department is set. */
export function teacherLabel(t) {
  return t.department ? `${t.name} · ${t.department}` : t.name;
}

/** Distinct, sorted departments already in use, for input suggestions. */
export function departmentsOf(teachers = []) {
  return [...new Set(teachers.map(t => t.department?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
