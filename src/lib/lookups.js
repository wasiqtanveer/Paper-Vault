import { supabase } from './supabase';
import { cachedSafeQuery } from './cache';

/**
 * Shared, cached subject and teacher lists. Every page that needs them goes
 * through here, so there is one cache key per table instead of one per page.
 * AdminPanel invalidates these keys after it edits the catalog.
 */
export const SUBJECTS_KEY = 'lookup:subjects';
export const TEACHERS_KEY = 'lookup:teachers';
const TTL = 300_000;

export const getSubjects = onError => cachedSafeQuery(
  SUBJECTS_KEY, () => supabase.from('subjects').select('id, name').order('name'),
  { fallback: [], onError, label: 'subjects', ttl: TTL },
);

export const getTeachers = onError => cachedSafeQuery(
  TEACHERS_KEY, () => supabase.from('teachers').select('id, name, department').order('name'),
  { fallback: [], onError, label: 'teachers', ttl: TTL },
);
