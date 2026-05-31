-- CV clone lineage; library lists only kind = primary
alter table public.cv
  add column if not exists source_cv_id uuid references public.cv (id) on delete set null;

alter table public.cv
  add column if not exists kind text not null default 'primary';

update public.cv
set kind = 'primary'
where kind is null;

alter table public.cv
  drop constraint if exists cv_kind_check;

alter table public.cv
  add constraint cv_kind_check check (kind in ('primary', 'application_clone'));

create index if not exists cv_user_kind_updated_idx
  on public.cv (user_id, kind, updated_at desc);

create index if not exists cv_source_cv_id_idx on public.cv (source_cv_id);

-- Job application records
create table public.job_application (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'queued',
  job_title text,
  job_company text,
  job_source_type text,
  job_raw_text text,
  source_cv_id uuid references public.cv (id) on delete set null,
  tailored_cv_id uuid references public.cv (id) on delete set null,
  cover_letter text,
  selection_rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_application_user_updated_idx
  on public.job_application (user_id, updated_at desc);

alter table public.job_application enable row level security;

create policy "Users can view own job applications"
  on public.job_application for select
  using (auth.uid() = user_id);

create policy "Users can insert own job applications"
  on public.job_application for insert
  with check (auth.uid() = user_id);

create policy "Users can update own job applications"
  on public.job_application for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own job applications"
  on public.job_application for delete
  using (auth.uid() = user_id);

create trigger job_application_set_updated_at
  before update on public.job_application
  for each row execute function public.set_updated_at();
