-- Final cutover: drop legacy jsonb blob and computed title column

alter table public.cv
  drop column if exists data,
  drop column if exists title;
