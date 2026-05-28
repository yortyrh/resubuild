-- Multi-account AI agent credentials (replaces import_llm_config)

create table public.ai_agent_account (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  provider_id text not null,
  model_id text not null,
  api_key_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ai_agent_account_user_label_unique
  on public.ai_agent_account (user_id, label)
  where label is not null;

create table public.ai_agent_preference (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_account_id uuid references public.ai_agent_account (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.ai_agent_account enable row level security;
alter table public.ai_agent_preference enable row level security;

create policy "Users can view own ai agent accounts"
  on public.ai_agent_account for select
  using (auth.uid() = user_id);

create policy "Users can insert own ai agent accounts"
  on public.ai_agent_account for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ai agent accounts"
  on public.ai_agent_account for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own ai agent accounts"
  on public.ai_agent_account for delete
  using (auth.uid() = user_id);

create policy "Users can view own ai agent preference"
  on public.ai_agent_preference for select
  using (auth.uid() = user_id);

create policy "Users can insert own ai agent preference"
  on public.ai_agent_preference for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ai agent preference"
  on public.ai_agent_preference for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own ai agent preference"
  on public.ai_agent_preference for delete
  using (auth.uid() = user_id);

create trigger ai_agent_account_set_updated_at
  before update on public.ai_agent_account
  for each row execute function public.set_updated_at();

create trigger ai_agent_preference_set_updated_at
  before update on public.ai_agent_preference
  for each row execute function public.set_updated_at();

-- Backfill from legacy import_llm_config
insert into public.ai_agent_account (user_id, label, provider_id, model_id, api_key_encrypted, created_at, updated_at)
select
  user_id,
  'Default',
  split_part(model_id, '/', 1),
  model_id,
  api_key_encrypted,
  created_at,
  updated_at
from public.import_llm_config;

insert into public.ai_agent_preference (user_id, active_account_id)
select ilc.user_id, aaa.id
from public.import_llm_config ilc
join public.ai_agent_account aaa
  on aaa.user_id = ilc.user_id
 and aaa.label = 'Default';

drop table public.import_llm_config;
