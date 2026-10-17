-- The organization dashboard's storage (spec 007, plan Data, D-04): every
-- row belongs to an organization, and deleting the organization deletes
-- them all (FR-001, FR-002). Row-level access is already on for each table
-- (the previous migration); here are their grants and policies (FR-003).
-- Every policy reads the organization from the signed-in person's token, as
-- Supabase's Clerk example does, wrapped in a select so it's read once per
-- query (Supabase: RLS performance), and names its role.

-- The organizations that own rows, keyed by Clerk's organization ID (the
-- token's o.id). Rows are added when an organization first stores
-- something (spec 008) and by the local seed.
create table public.organizations (
  id text primary key,
  created_at timestamptz not null default now()
);

-- An organization's map of one repository (CONTEXT.md: Analysis), at most
-- one per repository.
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations on delete cascade,
  repository text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, repository),
  -- The target of runs' reference, so a run's organization is its
  -- analysis's.
  unique (organization_id, id)
);

-- One pass over a repository (CONTEXT.md: Run, Stage). It carries its own
-- organization, so its policy reads one indexed column, and that
-- organization can only be its analysis's: the reference is to both.
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations on delete cascade,
  analysis_id uuid not null,
  state text not null check (state in ('fetching', 'parsing', 'storing', 'done', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade
);

-- An index on every column a policy or a foreign key filters on.
-- analyses (organization_id, …) is covered by its unique constraint.
create index runs_organization_id on public.runs (organization_id);
create index runs_analysis_id_started_at on public.runs (analysis_id, started_at desc);

-- Grants: reading only, for signed-in people (spec 007 lists; 008 writes).
grant select on public.organizations to authenticated;
grant select on public.analyses to authenticated;
grant select on public.runs to authenticated;

-- The deletion webhook's secret key deletes an organization's row, which
-- cascades (plan D-07); select is needed to find it.
grant select, delete on public.organizations to service_role;

create policy "Members read their organization"
on public.organizations for select
to authenticated
using (id = ((select auth.jwt()) -> 'o' ->> 'id'));

create policy "Members read their organization's analyses"
on public.analyses for select
to authenticated
using (organization_id = ((select auth.jwt()) -> 'o' ->> 'id'));

create policy "Members read their organization's runs"
on public.runs for select
to authenticated
using (organization_id = ((select auth.jwt()) -> 'o' ->> 'id'));
