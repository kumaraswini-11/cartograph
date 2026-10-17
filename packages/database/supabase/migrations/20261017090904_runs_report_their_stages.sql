-- Runs that report their stages, and the results they store (spec 008,
-- plan Data, D-06 to D-08, D-12). Members still only read: every write is a
-- function here that the server calls with the secret key, taking the
-- organization from the signed-in person's verified session (D-06), so the
-- grants below give service_role, the secret key's role, what those
-- functions touch, and give members nothing new but reading results.

-- One analysis per repository per organization (C-01), whatever the case:
-- GitHub reads `Facebook/React` as `facebook/react`. The analysis keeps the
-- address as the member wrote it.
alter table public.analyses
  drop constraint analyses_organization_id_repository_key;
create unique index analyses_one_per_repository
  on public.analyses (organization_id, lower(repository));

-- A repository is `owner/name` as GitHub allows them, whoever writes it:
-- the address is checked before it gets here (FR-001), and the database
-- refuses anything else too.
alter table public.analyses
  add constraint analyses_repository_is_owner_name
    check (repository ~ '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}/[A-Za-z0-9._-]{1,100}$');

-- What a run reports (007 left these to 008): the current stage's sentence,
-- or why it failed (FR-007, FR-010); the stage it failed in; and the commit
-- it fetched (FR-005).
alter table public.runs
  add column message text not null default '',
  add column failed_stage text
    check (failed_stage in ('fetching', 'parsing', 'storing')),
  add column commit text check (commit ~ '^[0-9a-f]{40}([0-9a-f]{24})?$');

-- Runs from before this migration exist only in local seeds (production has
-- none yet): a failed one recorded no stage, so it says so, and an ended
-- one may lack its end, taken as its start.
update public.runs
set failed_stage = 'fetching',
  message = 'Failed before runs recorded the stage they failed in.'
where state = 'failed';
update public.runs
set finished_at = started_at
where state in ('done', 'failed') and finished_at is null;

alter table public.runs
  add constraint runs_failure_names_its_stage
    check ((state = 'failed') = (failed_stage is not null)),
  add constraint runs_end_when_finished
    check ((state in ('done', 'failed')) = (finished_at is not null));

-- At most one unfinished run per analysis (FR-004, AC-11). A constraint,
-- not a check made before inserting: a second start that races the first
-- fails here, whatever the timing (D-07).
create unique index runs_one_unfinished
  on public.runs (analysis_id)
  where state in ('fetching', 'parsing', 'storing');

-- A run unfinished for longer than STALE_RUN_AFTER, 10 minutes (FR-013,
-- C-05). Written once, here, and compared on the database's clock, the one
-- that wrote started_at (D-08). PostgREST reads it as a field of runs:
-- `runs(state, stale)`.
create function public.stale(run public.runs)
returns boolean
language sql
stable
set search_path = ''
as $$
  select run.state in ('fetching', 'parsing', 'storing')
    and run.started_at < now() - interval '10 minutes'
$$;

-- An analysis's stored result: the parser's and detection's output, at the
-- commit they came from (FR-015, AC-08). One per analysis, replaced by each
-- done run, so a failed re-run leaves the last map (D-12).
create table public.results (
  analysis_id uuid primary key,
  organization_id text not null references public.organizations on delete cascade,
  commit text not null check (commit ~ '^[0-9a-f]{40}([0-9a-f]{24})?$'),
  parsed jsonb not null,
  detection jsonb not null,
  stored_at timestamptz not null default now(),
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade
);

create index results_organization_id on public.results (organization_id);

grant select on public.results to authenticated;

create policy "Members read their organization's results"
on public.results for select
to authenticated
using (organization_id = ((select auth.jwt()) -> 'o' ->> 'id'));

grant execute on function public.stale(public.runs) to authenticated, service_role;

-- What the write functions touch, for the secret key's role only.
grant insert on public.organizations to service_role;
grant select, insert on public.analyses to service_role;
grant select, insert, update on public.runs to service_role;
grant select, insert, update on public.results to service_role;

-- A repository submitted (FR-001, FR-002): the organization's row if it's
-- new, then its analysis of the repository. An analysis that exists is
-- returned with no run (FR-002); a new one is returned with its first run,
-- in its first stage.
create function public.start_analysis(
  organization text,
  repository text,
  message text
)
returns table (analysis_id uuid, run_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  existing uuid;
  started uuid;
begin
  insert into public.organizations (id) values (organization)
  on conflict do nothing;

  insert into public.analyses (organization_id, repository)
  values (organization, start_analysis.repository)
  on conflict (organization_id, lower(repository)) do nothing
  returning id into existing;

  if existing is null then
    select a.id into existing
    from public.analyses a
    where a.organization_id = organization
      and lower(a.repository) = lower(start_analysis.repository);
    return query select existing, null::uuid;
    return;
  end if;

  insert into public.runs (organization_id, analysis_id, state, message)
  values (organization, existing, 'fetching', start_analysis.message)
  returning id into started;
  return query select existing, started;
end;
$$;

-- A re-run chosen from an analysis (FR-003). A stale run is ended first, as
-- failed in the stage it reached, with `stopped` as its reason (the spec's
-- edge case). Then a new run starts, unless one is still unfinished
-- (FR-004): that one is returned instead, and `started` says which.
create function public.rerun_analysis(
  organization text,
  analysis uuid,
  message text,
  stopped text
)
returns table (run_id uuid, started boolean)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  run uuid;
begin
  if not exists (
    select 1 from public.analyses a
    where a.id = analysis and a.organization_id = organization
  ) then
    raise exception 'No analysis % in organization %', analysis, organization
      using errcode = 'P0002';
  end if;

  update public.runs r
  set state = 'failed',
    failed_stage = r.state,
    message = stopped,
    finished_at = now()
  where r.analysis_id = analysis and public.stale(r);

  begin
    insert into public.runs (organization_id, analysis_id, state, message)
    values (organization, analysis, 'fetching', rerun_analysis.message)
    returning id into run;
    return query select run, true;
  exception when unique_violation then
    select r.id into run
    from public.runs r
    where r.analysis_id = analysis
      and r.state in ('fetching', 'parsing', 'storing');
    return query select run, false;
  end;
end;
$$;

-- A run moves to its next stage, with that stage's sentence and, once
-- fetched, its commit (FR-005, FR-006). False when the run has already
-- ended (a stale run a re-run ended), so the runner stops.
create function public.advance_run(
  run uuid,
  stage text,
  message text,
  commit text default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if stage not in ('fetching', 'parsing', 'storing') then
    raise exception 'Not a stage: %', stage using errcode = '22023';
  end if;
  update public.runs r
  set state = stage,
    message = advance_run.message,
    commit = coalesce(advance_run.commit, r.commit)
  where r.id = run and r.state in ('fetching', 'parsing', 'storing');
  return found;
end;
$$;

-- A run ends as failed in the stage it reached, with why (FR-007). An
-- ended run is left as it is.
create function public.fail_run(run uuid, message text)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.runs r
  set failed_stage = r.state,
    state = 'failed',
    message = fail_run.message,
    finished_at = now()
  where r.id = run and r.state in ('fetching', 'parsing', 'storing');
$$;

-- A run ends done: its results stored with the commit it fetched, and the
-- run marked done, in one transaction, so a done run always has its results
-- (FR-015, D-12). False when the run had already ended.
create function public.finish_run(
  run uuid,
  parsed jsonb,
  detection jsonb,
  message text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  ending public.runs;
begin
  select * into ending
  from public.runs r
  where r.id = run and r.state in ('fetching', 'parsing', 'storing')
  for update;
  if not found then
    return false;
  end if;
  if ending.commit is null then
    raise exception 'Run % has no commit to store results under', run
      using errcode = '23502';
  end if;

  insert into public.results
    (analysis_id, organization_id, commit, parsed, detection)
  values
    (ending.analysis_id, ending.organization_id, ending.commit,
     finish_run.parsed, finish_run.detection)
  on conflict (analysis_id) do update
  set commit = excluded.commit,
    parsed = excluded.parsed,
    detection = excluded.detection,
    stored_at = now();

  update public.runs r
  set state = 'done',
    message = finish_run.message,
    finished_at = now()
  where r.id = run;
  return true;
end;
$$;

-- Only the server, with the secret key, may call them (D-06). Default
-- privileges grant nothing on new functions (the first migration); these
-- say so outright.
revoke all on function public.start_analysis(text, text, text) from public, anon, authenticated;
revoke all on function public.rerun_analysis(text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.advance_run(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.fail_run(uuid, text) from public, anon, authenticated;
revoke all on function public.finish_run(uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.start_analysis(text, text, text) to service_role;
grant execute on function public.rerun_analysis(text, uuid, text, text) to service_role;
grant execute on function public.advance_run(uuid, text, text, text) to service_role;
grant execute on function public.fail_run(uuid, text) to service_role;
grant execute on function public.finish_run(uuid, jsonb, jsonb, text) to service_role;
