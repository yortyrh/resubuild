-- Backfill normalized CV tables from legacy cv.data jsonb blob

-- Header / basics / meta
update public.cv
set
  name = nullif(data->'basics'->>'name', ''),
  label = nullif(data->'basics'->>'label', ''),
  image = nullif(data->'basics'->>'image', ''),
  email = nullif(data->'basics'->>'email', ''),
  phone = nullif(data->'basics'->>'phone', ''),
  url = nullif(data->'basics'->>'url', ''),
  summary = nullif(data->'basics'->>'summary', ''),
  location = coalesce(data->'basics'->'location', '{}'::jsonb),
  meta_version = nullif(data->'meta'->>'version', ''),
  meta_canonical = nullif(data->'meta'->>'canonical', ''),
  meta_last_modified = case
    when data->'meta'->>'lastModified' is not null
      then (data->'meta'->>'lastModified')::timestamptz
    else null
  end
where data is not null and data <> '{}'::jsonb;

-- cv_profile from basics.profiles
insert into public.cv_profile (cv_id, sort, network, username, url)
select
  c.id,
  (p.ordinality - 1)::int as sort,
  nullif(p.value->>'network', ''),
  nullif(p.value->>'username', ''),
  nullif(p.value->>'url', '')
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'basics'->'profiles', '[]'::jsonb))
  with ordinality as p(value, ordinality)
where c.data is not null;

-- cv_work
insert into public.cv_work (
  cv_id, name, location, description, position, url,
  start_date, end_date, summary, highlights
)
select
  c.id,
  nullif(w.value->>'name', ''),
  nullif(w.value->>'location', ''),
  nullif(w.value->>'description', ''),
  nullif(w.value->>'position', ''),
  nullif(w.value->>'url', ''),
  nullif(w.value->>'startDate', ''),
  nullif(w.value->>'endDate', ''),
  nullif(w.value->>'summary', ''),
  coalesce(w.value->'highlights', '[]'::jsonb)
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'work', '[]'::jsonb)) as w(value)
where c.data is not null;

-- cv_volunteer
insert into public.cv_volunteer (
  cv_id, organization, position, url, start_date, end_date, summary, highlights
)
select
  c.id,
  nullif(v.value->>'organization', ''),
  nullif(v.value->>'position', ''),
  nullif(v.value->>'url', ''),
  nullif(v.value->>'startDate', ''),
  nullif(v.value->>'endDate', ''),
  nullif(v.value->>'summary', ''),
  coalesce(v.value->'highlights', '[]'::jsonb)
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'volunteer', '[]'::jsonb)) as v(value)
where c.data is not null;

-- cv_education
insert into public.cv_education (
  cv_id, institution, url, area, study_type, start_date, end_date, score, courses
)
select
  c.id,
  nullif(e.value->>'institution', ''),
  nullif(e.value->>'url', ''),
  nullif(e.value->>'area', ''),
  nullif(e.value->>'studyType', ''),
  nullif(e.value->>'startDate', ''),
  nullif(e.value->>'endDate', ''),
  nullif(e.value->>'score', ''),
  coalesce(e.value->'courses', '[]'::jsonb)
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'education', '[]'::jsonb)) as e(value)
where c.data is not null;

-- cv_award
insert into public.cv_award (cv_id, title, date, awarder, summary)
select
  c.id,
  nullif(a.value->>'title', ''),
  nullif(a.value->>'date', ''),
  nullif(a.value->>'awarder', ''),
  nullif(a.value->>'summary', '')
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'awards', '[]'::jsonb)) as a(value)
where c.data is not null;

-- cv_certificate
insert into public.cv_certificate (cv_id, name, date, url, issuer)
select
  c.id,
  nullif(cert.value->>'name', ''),
  nullif(cert.value->>'date', ''),
  nullif(cert.value->>'url', ''),
  nullif(cert.value->>'issuer', '')
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'certificates', '[]'::jsonb)) as cert(value)
where c.data is not null;

-- cv_publication
insert into public.cv_publication (cv_id, name, publisher, release_date, url, summary)
select
  c.id,
  nullif(p.value->>'name', ''),
  nullif(p.value->>'publisher', ''),
  nullif(p.value->>'releaseDate', ''),
  nullif(p.value->>'url', ''),
  nullif(p.value->>'summary', '')
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'publications', '[]'::jsonb)) as p(value)
where c.data is not null;

-- cv_skill
insert into public.cv_skill (cv_id, sort, name, level, keywords)
select
  c.id,
  (s.ordinality - 1)::int as sort,
  nullif(s.value->>'name', ''),
  nullif(s.value->>'level', ''),
  coalesce(s.value->'keywords', '[]'::jsonb)
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'skills', '[]'::jsonb))
  with ordinality as s(value, ordinality)
where c.data is not null;

-- cv_language
insert into public.cv_language (cv_id, sort, language, fluency)
select
  c.id,
  (l.ordinality - 1)::int as sort,
  nullif(l.value->>'language', ''),
  nullif(l.value->>'fluency', '')
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'languages', '[]'::jsonb))
  with ordinality as l(value, ordinality)
where c.data is not null;

-- cv_interest
insert into public.cv_interest (cv_id, sort, name, keywords)
select
  c.id,
  (i.ordinality - 1)::int as sort,
  nullif(i.value->>'name', ''),
  coalesce(i.value->'keywords', '[]'::jsonb)
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'interests', '[]'::jsonb))
  with ordinality as i(value, ordinality)
where c.data is not null;

-- cv_reference
insert into public.cv_reference (cv_id, sort, name, reference)
select
  c.id,
  (r.ordinality - 1)::int as sort,
  nullif(r.value->>'name', ''),
  nullif(r.value->>'reference', '')
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'references', '[]'::jsonb))
  with ordinality as r(value, ordinality)
where c.data is not null;

-- cv_project
insert into public.cv_project (
  cv_id, name, description, start_date, end_date, url, entity, type,
  highlights, keywords, roles
)
select
  c.id,
  nullif(p.value->>'name', ''),
  nullif(p.value->>'description', ''),
  nullif(p.value->>'startDate', ''),
  nullif(p.value->>'endDate', ''),
  nullif(p.value->>'url', ''),
  nullif(p.value->>'entity', ''),
  nullif(p.value->>'type', ''),
  coalesce(p.value->'highlights', '[]'::jsonb),
  coalesce(p.value->'keywords', '[]'::jsonb),
  coalesce(p.value->'roles', '[]'::jsonb)
from public.cv c
cross join lateral jsonb_array_elements(coalesce(c.data->'projects', '[]'::jsonb)) as p(value)
where c.data is not null;
