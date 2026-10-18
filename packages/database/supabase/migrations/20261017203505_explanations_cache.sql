-- The organization's cache of explanations (spec 009, FR-010, plan Data,
-- D-09). Every row belongs to an organization, as every table does (007):
-- deleting it, or the analysis it was written for, deletes the rows.
-- Members read through 007's policy; the server writes with the secret
-- key, taking the organization from the verified session (008 D-06).

-- One explanation per cache key, per organization. The key is a SHA-256 of
-- what was explained (a file's content hash, or a box's files), the
-- neighbours it was written from, the model and the prompt version, so a
-- change to any of them misses the cache.
create table public.explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations on delete cascade,
  -- The analysis it was first written for; another analysis of the same
  -- organization with the same key reuses it.
  analysis_id uuid not null,
  cache_key text not null check (cache_key ~ '^[0-9a-f]{64}$'),
  -- The file's or the folder's path, as the analysis names it.
  subject text not null,
  kind text not null check (kind in ('file', 'box')),
  -- The paragraph, as the model wrote it; rendered in three formats only.
  body text not null check (length(body) > 0),
  -- For a file no adapter identified (FR-009): one of the fixed roles,
  -- never a surface role (C-02), whoever writes the row.
  inferred_role text check (inferred_role in (
    'service', 'data access', 'model', 'utility', 'configuration',
    'component', 'hook'
  )),
  -- The exact model version and the prompt version it was written with
  -- (FR-010, FR-012).
  model text not null,
  prompt_version integer not null check (prompt_version > 0),
  created_at timestamptz not null default now(),
  unique (organization_id, cache_key),
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade
);

-- An index on every column a policy or a foreign key filters on (007).
-- (organization_id, cache_key) is covered by its unique constraint.
create index explanations_analysis_id on public.explanations (analysis_id);

grant select on public.explanations to authenticated;
grant select, insert on public.explanations to service_role;

create policy "Members read their organization's explanations"
on public.explanations for select
to authenticated
using (organization_id = ((select auth.jwt()) -> 'o' ->> 'id'));
