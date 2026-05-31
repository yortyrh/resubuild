alter table public.job_application
  add column if not exists cover_letter_email_subject text;
