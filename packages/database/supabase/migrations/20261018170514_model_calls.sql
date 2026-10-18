-- The model calls each organization makes (spec 012, FR-007, plan Data,
-- D-05): what the daily limit counts. Every row belongs to an organization,
-- as every table does (007): deleting it deletes its rows. Members read
-- through 007's policy; the server writes with the secret key, taking the
-- organization from the verified session (008 D-06).
create table public.model_calls (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations on delete cascade,
  -- An explanation written (009) or a chat question answered (010).
  kind text not null check (kind in ('explanation', 'chat')),
  called_at timestamptz not null default now()
);

-- The limit counts an organization's calls since a moment: one index serves
-- the policy, the foreign key and that count (007).
create index model_calls_organization_called_at
  on public.model_calls (organization_id, called_at);

grant select on public.model_calls to authenticated;
grant select, insert on public.model_calls to service_role;

create policy "Members read their organization's model calls"
on public.model_calls for select
to authenticated
using (organization_id = ((select auth.jwt()) -> 'o' ->> 'id'));
