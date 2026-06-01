-- Hidden storage for work-only fields when entries move Work → Volunteer
alter table public.cv_volunteer
  add column if not exists location text,
  add column if not exists description text;
