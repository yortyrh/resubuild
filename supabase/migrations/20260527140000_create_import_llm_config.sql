-- Per-user LLM settings for PDF import (encrypted API keys)
create table public.import_llm_config (
  user_id uuid primary key references auth.users (id) on delete cascade,
  model_id text not null,
  api_key_encrypted text not null,
  configured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.import_llm_config enable row level security;

create policy "Users can view own import llm config"
  on public.import_llm_config for select
  using (auth.uid() = user_id);

create policy "Users can insert own import llm config"
  on public.import_llm_config for insert
  with check (auth.uid() = user_id);

create policy "Users can update own import llm config"
  on public.import_llm_config for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own import llm config"
  on public.import_llm_config for delete
  using (auth.uid() = user_id);

create trigger import_llm_config_set_updated_at
  before update on public.import_llm_config
  for each row execute function public.set_updated_at();
