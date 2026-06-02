-- Staged application updates: hidden replacement drafts linked to the active original.

alter table public.job_application
  add column if not exists source_application_id uuid references public.job_application (id) on delete set null;

alter table public.job_application
  add column if not exists is_list_visible boolean not null default true;

update public.job_application
set is_list_visible = true
where is_list_visible is null;

create index if not exists job_application_source_application_id_idx
  on public.job_application (source_application_id)
  where source_application_id is not null;

create index if not exists job_application_user_list_visible_updated_idx
  on public.job_application (user_id, is_list_visible, updated_at desc);
