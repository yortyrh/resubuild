-- Replaced by kind = primary library filter (see job_application migration)
drop index if exists public.cv_user_visible_updated_idx;

alter table public.cv
  drop column if exists visible_in_library;
