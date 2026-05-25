-- Extend public.media with crop metadata and cropped derivative path.
alter table public.media add column crop jsonb null;
alter table public.media add column cropped_storage_path text null;

-- RLS policy for owner-only updates (crop writes).
create policy "Users can update own media rows"
on public.media for update
using (auth.uid () = user_id);
