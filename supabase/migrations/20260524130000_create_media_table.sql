-- Media registry for uploads served via the Nest `/media/:id` proxy (opaque UUID URLs).
create table public.media (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  content_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint media_storage_path_key unique (storage_path)
);

create index media_user_id_created_at_idx on public.media (user_id, created_at desc);

alter table public.media enable row level security;

-- JWToken-scoped reads for potential direct Supabase access (API uses service role elsewhere).
create policy "Users can view own media rows"
on public.media for select
using (auth.uid () = user_id);

create policy "Users can insert own media rows"
on public.media for insert
with check (auth.uid () = user_id);

create policy "Users can delete own media rows"
on public.media for delete
using (auth.uid () = user_id);
