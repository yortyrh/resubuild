-- Per-CV, per-template presentation settings (section order, visibility, field toggles)
create table public.cv_template_presentation (
  cv_id uuid not null references public.cv (id) on delete cascade,
  template_id text not null,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (cv_id, template_id)
);

create index cv_template_presentation_cv_id_idx on public.cv_template_presentation (cv_id);

alter table public.cv_template_presentation enable row level security;

create policy "Users can view own cv template presentation"
  on public.cv_template_presentation for select
  using (
    exists (
      select 1 from public.cv
      where cv.id = cv_template_presentation.cv_id
        and cv.user_id = auth.uid()
    )
  );

create policy "Users can insert own cv template presentation"
  on public.cv_template_presentation for insert
  with check (
    exists (
      select 1 from public.cv
      where cv.id = cv_template_presentation.cv_id
        and cv.user_id = auth.uid()
    )
  );

create policy "Users can update own cv template presentation"
  on public.cv_template_presentation for update
  using (
    exists (
      select 1 from public.cv
      where cv.id = cv_template_presentation.cv_id
        and cv.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cv
      where cv.id = cv_template_presentation.cv_id
        and cv.user_id = auth.uid()
    )
  );

create policy "Users can delete own cv template presentation"
  on public.cv_template_presentation for delete
  using (
    exists (
      select 1 from public.cv
      where cv.id = cv_template_presentation.cv_id
        and cv.user_id = auth.uid()
    )
  );

create trigger cv_template_presentation_set_updated_at
  before update on public.cv_template_presentation
  for each row execute function public.set_updated_at();

-- Normalize legacy template ids on cv rows
update public.cv set template_id = 'classic' where template_id = 'mit-classic';
update public.cv set template_id = 'modern' where template_id = 'capd-design';
update public.cv set template_id = 'tabular' where template_id = 'capd-first-year-tabular';
update public.cv set template_id = 'left' where template_id = 'capd-global';
update public.cv set template_id = 'classic' where template_id in (
  'capd-first-year-leadership',
  'capd-undergraduate-mixed',
  'capd-undergraduate-standard',
  'capd-masters-icons',
  'capd-masters-skills-first',
  'capd-masters-standard',
  'capd-phd-academic',
  'capd-phd-summary',
  'capd-phd-summary-extended',
  'capd-phd-consulting',
  'capd-alum'
);
