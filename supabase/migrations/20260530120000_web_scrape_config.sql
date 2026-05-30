-- Per-user website scrape provider (Firecrawl or Tavily) for CV import from HTML pages
create table public.web_scrape_config (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('firecrawl', 'tavily')),
  api_key_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.web_scrape_config enable row level security;

create policy "Users can view own web scrape config"
  on public.web_scrape_config for select
  using (auth.uid() = user_id);

create policy "Users can insert own web scrape config"
  on public.web_scrape_config for insert
  with check (auth.uid() = user_id);

create policy "Users can update own web scrape config"
  on public.web_scrape_config for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own web scrape config"
  on public.web_scrape_config for delete
  using (auth.uid() = user_id);

create trigger web_scrape_config_set_updated_at
  before update on public.web_scrape_config
  for each row execute function public.set_updated_at();
