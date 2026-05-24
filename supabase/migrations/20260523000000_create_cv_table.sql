-- CV table for JSON Resume documents
create table public.cv (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled CV',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cv_user_id_updated_at_idx on public.cv (user_id, updated_at desc);

alter table public.cv enable row level security;

create policy "Users can view own cvs"
  on public.cv for select
  using (auth.uid() = user_id);

create policy "Users can insert own cvs"
  on public.cv for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cvs"
  on public.cv for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own cvs"
  on public.cv for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cv_set_updated_at
  before update on public.cv
  for each row execute function public.set_updated_at();
