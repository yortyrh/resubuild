-- Preserve base CV JSON on applications so regeneration works after source CV deletion
alter table public.job_application
  add column if not exists source_cv_snapshot jsonb;
