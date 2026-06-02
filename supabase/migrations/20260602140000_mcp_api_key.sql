-- MCP API keys and per-user MCP opt-in

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mcp_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mcp_api_key (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  key_prefix text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index mcp_api_key_user_id_idx on public.mcp_api_key (user_id);
create index mcp_api_key_active_user_idx on public.mcp_api_key (user_id)
  where revoked_at is null;

alter table public.user_settings enable row level security;
alter table public.mcp_api_key enable row level security;

create policy "Users can view own user_settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own user_settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own user_settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view own mcp_api_key"
  on public.mcp_api_key for select
  using (auth.uid() = user_id);

create policy "Users can insert own mcp_api_key"
  on public.mcp_api_key for insert
  with check (auth.uid() = user_id);

create policy "Users can update own mcp_api_key"
  on public.mcp_api_key for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.cv
  drop constraint if exists cv_kind_check;

alter table public.cv
  add constraint cv_kind_check check (kind in ('primary', 'application_clone', 'import_staging'));
