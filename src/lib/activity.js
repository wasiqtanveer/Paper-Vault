import { reportWarning } from './logger';
import { supabase } from './supabase';

/**
 * Write one row to activity_log.
 *
 * Every caller used to fire `supabase.from('activity_log').insert(...)` and
 * ignore the result, so a rejected insert (bad action value, RLS, missing
 * column) vanished without a trace and the admin log silently stayed empty.
 * This surfaces the failure in the console and returns whether it worked.
 *
 * Action values are the canonical set the admin panel understands:
 * upload | approve | reject | restore | delete | role_change | subject_add | subject_delete |
 * teacher_add | teacher_delete | request_approve | request_decline | hof_add | hof_remove
 * (enforced by the activity_log_action_check constraint; labels live in activityActions.js)
 */
export async function logActivity({ action, user, profile, fallbackRole, paperId = null, paperTitle = null }) {
  const { error } = await supabase.from('activity_log').insert({
    action,
    actor_id:    user?.id ?? null,
    actor_name:  profile?.full_name ?? user?.email ?? null,
    actor_role:  profile?.role ?? fallbackRole ?? null,
    paper_id:    paperId,
    paper_title: paperTitle,
  });
  if (error) {
    reportWarning(`[activity_log] could not record "${action}":`, error.message);
    return false;
  }
  return true;
}
