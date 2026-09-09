-- ============================================================================
-- PaperVault - align paper titles with their subject/teacher (2026-11-15)
-- Standard format: Subject — Teacher — Year — Term — Type (as the upload form builds it).
-- Rejected papers are not touched.
-- ============================================================================
begin;

-- 1. "Data Science — Mr. Abrar — …" was filed under Data structures; it is Data Science.
update public.papers p
set subject_id = s.id
from public.subjects s
where s.name = 'Data Science'
  and p.title like 'Data Science — Mr. Abrar — 2026 — Spring — Mid%'
  and p.status <> 'rejected';

-- 2. Discrete Mathematics paper named Mr. Shahid in its title but had no teacher linked.
update public.papers p
set teacher_id = t.id
from public.teachers t
where t.name = 'Mr. Shahid'
  and p.teacher_id is null
  and p.title like 'Discrete Mathematics — 2026 — Spring — Mr. Shahid%';

-- 3. Rebuild every non-rejected title that drifted from its own fields.
update public.papers p
set title = concat_ws(' — ', s.name,
                      (select name from public.teachers where id = p.teacher_id),
                      p.year::text, p.semester, p.exam_type)
from public.subjects s
where s.id = p.subject_id
  and p.status <> 'rejected'
  and p.title is distinct from concat_ws(' — ', s.name,
                      (select name from public.teachers where id = p.teacher_id),
                      p.year::text, p.semester, p.exam_type);

commit;
