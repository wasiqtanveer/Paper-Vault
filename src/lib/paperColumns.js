/**
 * The papers select strings the app uses, defined once so Home, Browse,
 * PaperViewer and the edit modal can't drift apart (a missing relation shows up
 * as a blank subject or teacher on one page only).
 */

/** Everything a paper card or detail view renders: the row plus subject and teacher names. */
export const PAPER_SELECT = '*, subjects(name), teachers(name)';

/** The moderation queue also needs the uploader's name, which only staff can read. */
export const PAPER_MOD_SELECT = '*, subjects(name), profiles!papers_uploader_id_fkey(full_name)';
