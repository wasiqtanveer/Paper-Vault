/**
 * Label and colour for each activity_log action the app writes. Keep in step
 * with the CHECK constraint in supabase/migrations/20260525_activity_log_actions_fix.sql.
 * `approved` / `rejected` are legacy spellings still shown for old rows.
 */
export const ACTIONS = {
  upload:          ['Uploaded',         'var(--accent-blue)'],
  approve:         ['Approved',         'var(--status-approved)'],
  approved:        ['Approved',         'var(--status-approved)'],
  reject:          ['Rejected',         'var(--status-rejected)'],
  rejected:        ['Rejected',         'var(--status-rejected)'],
  restore:         ['Back to pending',  'var(--status-pending)'],
  delete:          ['Deleted',          'var(--status-rejected)'],
  role_change:     ['Role changed',     'var(--accent-blue)'],
  subject_add:     ['Subject added',    'var(--status-approved)'],
  subject_delete:  ['Subject removed',  'var(--status-rejected)'],
  teacher_add:     ['Teacher added',    'var(--status-approved)'],
  teacher_delete:  ['Teacher removed',  'var(--status-rejected)'],
  request_approve: ['Request approved', 'var(--status-approved)'],
  request_decline: ['Request declined', 'var(--status-rejected)'],
  hof_add:         ['Hall of Fame +',   'var(--accent-amber)'],
  hof_remove:      ['Hall of Fame −',   'var(--status-rejected)'],
};

export const actionLabel = action => ACTIONS[action]?.[0] ?? action;
export const actionColor = action => ACTIONS[action]?.[1] ?? 'var(--text-muted)';
