-- Editor preview derivative for profile photos (≤150×150, aspect-preserving).
alter table public.media add column thumbnail_storage_path text null;
