-- Normalized CV schema: basics on cv row + one table per JSON Resume section

-- Basics scalars, location, and meta on cv header
alter table public.cv
  add column if not exists name text,
  add column if not exists label text,
  add column if not exists image text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists url text,
  add column if not exists summary text,
  add column if not exists location jsonb not null default '{}'::jsonb,
  add column if not exists meta_version text,
  add column if not exists meta_canonical text,
  add column if not exists meta_last_modified timestamptz;

-- Sort-backed sections
create table public.cv_profile (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  sort int not null,
  network text,
  username text,
  url text
);

create index cv_profile_cv_id_sort_idx on public.cv_profile (cv_id, sort);

create table public.cv_skill (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  sort int not null,
  name text,
  level text,
  keywords jsonb not null default '[]'::jsonb
);

create index cv_skill_cv_id_sort_idx on public.cv_skill (cv_id, sort);

create table public.cv_language (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  sort int not null,
  language text,
  fluency text
);

create index cv_language_cv_id_sort_idx on public.cv_language (cv_id, sort);

create table public.cv_interest (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  sort int not null,
  name text,
  keywords jsonb not null default '[]'::jsonb
);

create index cv_interest_cv_id_sort_idx on public.cv_interest (cv_id, sort);

create table public.cv_reference (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  sort int not null,
  name text,
  reference text
);

create index cv_reference_cv_id_sort_idx on public.cv_reference (cv_id, sort);

-- Date-primary sections
create table public.cv_work (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  name text,
  location text,
  description text,
  position text,
  url text,
  start_date text,
  end_date text,
  summary text,
  highlights jsonb not null default '[]'::jsonb
);

create index cv_work_cv_id_start_date_idx on public.cv_work (cv_id, start_date desc);

create table public.cv_volunteer (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  organization text,
  position text,
  url text,
  start_date text,
  end_date text,
  summary text,
  highlights jsonb not null default '[]'::jsonb
);

create index cv_volunteer_cv_id_start_date_idx on public.cv_volunteer (cv_id, start_date desc);

create table public.cv_education (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  institution text,
  url text,
  area text,
  study_type text,
  start_date text,
  end_date text,
  score text,
  courses jsonb not null default '[]'::jsonb
);

create index cv_education_cv_id_start_date_idx on public.cv_education (cv_id, start_date desc);

create table public.cv_award (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  title text,
  date text,
  awarder text,
  summary text
);

create index cv_award_cv_id_date_idx on public.cv_award (cv_id, date desc);

create table public.cv_certificate (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  name text,
  date text,
  url text,
  issuer text
);

create index cv_certificate_cv_id_date_idx on public.cv_certificate (cv_id, date desc);

create table public.cv_publication (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  name text,
  publisher text,
  release_date text,
  url text,
  summary text
);

create index cv_publication_cv_id_release_date_idx on public.cv_publication (cv_id, release_date desc);

create table public.cv_project (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cv (id) on delete cascade,
  name text,
  description text,
  start_date text,
  end_date text,
  url text,
  entity text,
  type text,
  highlights jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  roles jsonb not null default '[]'::jsonb
);

create index cv_project_cv_id_start_date_idx on public.cv_project (cv_id, start_date desc);

-- RLS helper: child tables inherit cv ownership
create or replace function public.cv_belongs_to_user(p_cv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cv
    where id = p_cv_id and user_id = auth.uid()
  );
$$;

-- Enable RLS on all section tables
alter table public.cv_profile enable row level security;
alter table public.cv_skill enable row level security;
alter table public.cv_language enable row level security;
alter table public.cv_interest enable row level security;
alter table public.cv_reference enable row level security;
alter table public.cv_work enable row level security;
alter table public.cv_volunteer enable row level security;
alter table public.cv_education enable row level security;
alter table public.cv_award enable row level security;
alter table public.cv_certificate enable row level security;
alter table public.cv_publication enable row level security;
alter table public.cv_project enable row level security;

-- cv_profile policies
create policy "Users can view own cv_profile"
  on public.cv_profile for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_profile"
  on public.cv_profile for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_profile"
  on public.cv_profile for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_profile"
  on public.cv_profile for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_skill policies
create policy "Users can view own cv_skill"
  on public.cv_skill for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_skill"
  on public.cv_skill for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_skill"
  on public.cv_skill for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_skill"
  on public.cv_skill for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_language policies
create policy "Users can view own cv_language"
  on public.cv_language for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_language"
  on public.cv_language for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_language"
  on public.cv_language for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_language"
  on public.cv_language for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_interest policies
create policy "Users can view own cv_interest"
  on public.cv_interest for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_interest"
  on public.cv_interest for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_interest"
  on public.cv_interest for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_interest"
  on public.cv_interest for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_reference policies
create policy "Users can view own cv_reference"
  on public.cv_reference for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_reference"
  on public.cv_reference for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_reference"
  on public.cv_reference for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_reference"
  on public.cv_reference for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_work policies
create policy "Users can view own cv_work"
  on public.cv_work for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_work"
  on public.cv_work for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_work"
  on public.cv_work for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_work"
  on public.cv_work for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_volunteer policies
create policy "Users can view own cv_volunteer"
  on public.cv_volunteer for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_volunteer"
  on public.cv_volunteer for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_volunteer"
  on public.cv_volunteer for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_volunteer"
  on public.cv_volunteer for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_education policies
create policy "Users can view own cv_education"
  on public.cv_education for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_education"
  on public.cv_education for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_education"
  on public.cv_education for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_education"
  on public.cv_education for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_award policies
create policy "Users can view own cv_award"
  on public.cv_award for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_award"
  on public.cv_award for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_award"
  on public.cv_award for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_award"
  on public.cv_award for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_certificate policies
create policy "Users can view own cv_certificate"
  on public.cv_certificate for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_certificate"
  on public.cv_certificate for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_certificate"
  on public.cv_certificate for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_certificate"
  on public.cv_certificate for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_publication policies
create policy "Users can view own cv_publication"
  on public.cv_publication for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_publication"
  on public.cv_publication for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_publication"
  on public.cv_publication for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_publication"
  on public.cv_publication for delete
  using (public.cv_belongs_to_user(cv_id));

-- cv_project policies
create policy "Users can view own cv_project"
  on public.cv_project for select
  using (public.cv_belongs_to_user(cv_id));

create policy "Users can insert own cv_project"
  on public.cv_project for insert
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can update own cv_project"
  on public.cv_project for update
  using (public.cv_belongs_to_user(cv_id))
  with check (public.cv_belongs_to_user(cv_id));

create policy "Users can delete own cv_project"
  on public.cv_project for delete
  using (public.cv_belongs_to_user(cv_id));
