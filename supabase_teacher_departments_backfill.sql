-- ============================================================================
-- PaperVault - backfill teacher departments from the subjects they've taught
-- Derived 2026-11-15 from the papers table (teacher -> subjects of their papers).
-- Only fills empty departments; never overwrites one an admin already set.
-- Not inferred (no papers yet, or a cross-department subject): Dr. Majid
-- (Civic and Community Engagement), Dr. Saima Hassan, Dr. Sanaullah,
-- Dr. Zeeshan Iqbal, Ms. Shafaq. Set these in the admin panel.
-- ============================================================================
begin;

update public.teachers t
set department = m.department
from (values
  -- Computing subjects
  ('Dr. Altaf',             'Institute of Computing (IOC)'),  -- Information security
  ('Dr. Muhammad Ali Zeb',  'Institute of Computing (IOC)'),  -- Object Oriented Programming
  ('Dr. Rabia Khan',        'Institute of Computing (IOC)'),  -- Operating system
  ('Dr. Samina',            'Institute of Computing (IOC)'),  -- Web Development
  ('Mr. Abdullah',          'Institute of Computing (IOC)'),  -- Computer Networks
  ('Mr. Abdur-Rehman',      'Institute of Computing (IOC)'),  -- Search Engine Optimization
  ('Mr. Abrar',             'Institute of Computing (IOC)'),  -- COAL, Data structures
  ('Mr. Hammad Hassan',     'Institute of Computing (IOC)'),  -- Information security
  ('Mr. Ilyas',             'Institute of Computing (IOC)'),  -- Digital Logic and Design
  ('Mr. Kashif Ullah',      'Institute of Computing (IOC)'),  -- Compiler Construction
  ('Mr. Muhammad Adnan',    'Institute of Computing (IOC)'),  -- Mobile Application Development
  ('Mr. Muneer Umer',       'Institute of Computing (IOC)'),  -- Data Base
  ('Mr. Noormast',          'Institute of Computing (IOC)'),  -- Computer Networks
  ('Mr. Qadeem Khan',       'Institute of Computing (IOC)'),  -- Advanced Programming
  ('Mr. Sajid Ullah',       'Institute of Computing (IOC)'),  -- Software Engineering
  ('Mr. Umer Ayaaz',        'Institute of Computing (IOC)'),  -- Data Base, Web Development
  -- Mathematics
  ('Dr. Amjid Ali',         'Mathematics'),                   -- Quantitative Reasoning II, Intro to Logic
  ('Dr. Aslam Khan',        'Mathematics'),                   -- Discrete Mathematics
  ('Dr. Jawad Ali',         'Mathematics'),                   -- Linear Algebra
  -- Business
  ('Mr. Atif Nadeem',       'Institute of Business Studies (IBS)'), -- Entrepreneurship, Principles of Management
  ('Ms. Maleeha Yousaf',    'Institute of Business Studies (IBS)'), -- Financial Accounting
  -- English
  ('Mr. Farooq',            'English'),                       -- English-II (Communication Skills)
  ('Mr. Ishtiaq Muhammad',  'English'),                       -- Technical and Business Writing
  -- Pakistan Studies
  ('Mr. Rahmat Shah',       'Pakistan Studies')               -- (Introduction to) Pakistan Studies
) as m(name, department)
where t.name = m.name
  and t.department is null;

commit;
