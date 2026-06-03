/**
 * Departments whose teachers actually teach the subjects on PaperVault.
 * Names follow KUST's official departments (admissions.kohat.edu.pk); the
 * platform serves the Institute of Computing, so only the departments that
 * teach its courses are listed.
 */
export const DEPARTMENTS = [
  'Institute of Computing (IOC)',
  'Mathematics',
  'English',
  'Institute of Business Studies (IBS)',
  'Pakistan Studies',
  'Islamic Studies (Islamiyat)',
  'Sociology',
];

/**
 * Options for a department dropdown. A value saved before this list existed
 * (e.g. "Physics") is kept as an option so editing that teacher never
 * silently drops it.
 */
export function departmentOptions(current) {
  const opts = DEPARTMENTS.map(d => ({ value: d, label: d }));
  if (current && !DEPARTMENTS.includes(current)) opts.unshift({ value: current, label: current });
  return opts;
}
