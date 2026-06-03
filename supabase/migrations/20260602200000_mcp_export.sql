-- MCP export registry: short-lived signed-URL delivery for rendered CV artifacts.
-- The four `export_cv_*` MCP tools upload rendered HTML/PDF/PNG/JSON Resume to a
-- dedicated Supabase Storage bucket and register a row here so signed URLs can be
-- re-issued and expired rows can be swept.

create table public.mcp_export (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_id uuid not null,
  kind text not null check (kind in ('html','pdf','screenshot','jsonresume')),
  storage_path text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  filename text not null,
  template_id text,
  mode text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (id, user_id)
);

create index mcp_export_user_idx on public.mcp_export (user_id, created_at desc);
create index mcp_export_expiry_idx on public.mcp_export (expires_at);

alter table public.mcp_export enable row level security;

create policy mcp_export_owner_select on public.mcp_export
  for select using (auth.uid() = user_id);

create policy mcp_export_owner_delete on public.mcp_export
  for delete using (auth.uid() = user_id);
