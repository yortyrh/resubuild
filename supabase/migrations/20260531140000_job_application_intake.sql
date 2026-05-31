alter table public.job_application
  add column if not exists user_message text;

alter table public.job_application
  add column if not exists intake_source_cv_id uuid references public.cv (id) on delete set null;
