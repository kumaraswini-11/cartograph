-- Spec 008's runs and results, tested against the real functions (plan
-- D-06 to D-08, D-12). Each call is made as the secret key's role, the one
-- the server uses; members are shown to have no way to write. Run with
-- `supabase test db`; the transaction is rolled back at the end.
begin;
select plan(30);

set local role service_role;

-- FR-001, FR-002: the first submission creates the organization's row, the
-- analysis and its first run, in its first stage.
create temporary table first on commit drop as
  select * from public.start_analysis('org_a', 'Facebook/React', 'Reading facebook/react');
select isnt((select run_id from first), null, 'a new repository starts a run');
select is(
  (select state || ' / ' || message from public.runs where id = (select run_id from first)),
  'fetching / Reading facebook/react',
  'the run starts fetching, with its sentence'
);
select is(
  (select count(*) from public.organizations where id = 'org_a'),
  1::bigint,
  'the organization''s row is added with its first analysis'
);

-- FR-002, C-01: the same repository again, in any case, is the same
-- analysis, and no run starts.
select results_eq(
  $$select analysis_id, run_id from public.start_analysis('org_a', 'facebook/react', 'x')$$,
  $$select analysis_id, null::uuid from first$$,
  'a repository already analysed returns its analysis and starts no run'
);
select is(
  (select count(*) from public.analyses where organization_id = 'org_a'),
  1::bigint,
  'C-01: still one analysis, whatever the case of the address'
);
select is(
  (select repository from public.analyses where id = (select analysis_id from first)),
  'Facebook/React',
  'the analysis keeps the address as it was written'
);
select throws_ok(
  $$select * from public.start_analysis('org_a', 'https://gitlab.com/x/y', 'x')$$,
  '23514', null,
  'FR-001: the database refuses anything but owner/name'
);
select isnt(
  (select run_id from public.start_analysis('org_b', 'facebook/react', 'x')),
  null,
  'another organization gets its own analysis of the same repository'
);

-- AC-11, FR-004: while a run is unfinished, no second run starts, by a
-- re-run or by a direct insert.
select results_eq(
  $$select run_id, started from public.rerun_analysis('org_a', (select analysis_id from first), 'x', 'stopped')$$,
  $$select run_id, false from first$$,
  'AC-11: a re-run during a run returns that run and starts none'
);
select throws_ok(
  $$insert into public.runs (organization_id, analysis_id, state)
    select 'org_a', analysis_id, 'parsing' from first$$,
  '23505', null,
  'AC-11: the database refuses a second unfinished run'
);

-- FR-006, FR-005: a run moves through its stages and records its commit.
select ok(
  public.advance_run((select run_id from first), 'parsing', 'Parsing 3,536 files', repeat('c', 40)),
  'a run moves to its next stage'
);
select is(
  (select state || ' / ' || message || ' / ' || commit from public.runs where id = (select run_id from first)),
  'parsing / Parsing 3,536 files / ' || repeat('c', 40),
  'with that stage''s sentence and the commit fetched'
);
select ok(
  public.advance_run((select run_id from first), 'storing', 'Storing the map'),
  'a later stage keeps the commit'
);
select is(
  (select commit from public.runs where id = (select run_id from first)),
  repeat('c', 40),
  '…which stays recorded'
);
select throws_ok(
  $$select public.advance_run((select run_id from first), 'done', 'x')$$,
  '22023', null,
  'advancing only moves to a stage; ending is finish_run or fail_run'
);

-- AC-08, FR-015: a run ends done with its results, under its commit.
select ok(
  public.finish_run((select run_id from first), '{"files": []}', '{"files": []}', 'Done'),
  'a run ends done'
);
select is(
  (select commit from public.results where analysis_id = (select analysis_id from first)),
  repeat('c', 40),
  'AC-08: the stored results name the commit they came from'
);
select ok(
  (select finished_at is not null and state = 'done' from public.runs where id = (select run_id from first)),
  'the run is done, with its end'
);
select col_not_null('public', 'results', 'commit', 'AC-08: results can''t be stored without a commit');
select ok(
  not public.finish_run((select run_id from first), '{}', '{}', 'Done'),
  'an ended run can''t finish again'
);

-- FR-003: a re-run of a finished analysis starts a new run of it.
create temporary table second on commit drop as
  select * from public.rerun_analysis('org_a', (select analysis_id from first), 'Reading facebook/react', 'stopped');
select ok((select started from second), 'a re-run after the last run ended starts a new one');

-- FR-007: a failure records the stage it happened in, and why.
select public.advance_run((select run_id from second), 'parsing', 'Parsing');
select public.fail_run((select run_id from second), 'The parser stopped');
select is(
  (select state || ' / ' || failed_stage || ' / ' || message from public.runs where id = (select run_id from second)),
  'failed / parsing / The parser stopped',
  'FR-007: a failed run records its stage and why'
);
select ok(
  not public.advance_run((select run_id from second), 'storing', 'x'),
  'an ended run doesn''t move again'
);
select is(
  (select commit from public.results where analysis_id = (select analysis_id from first)),
  repeat('c', 40),
  'a failed re-run leaves the last results in place'
);

-- AC-05, FR-013: a run unfinished for over 10 minutes is stale; under,
-- it isn't.
create temporary table third on commit drop as
  select * from public.rerun_analysis('org_a', (select analysis_id from first), 'Reading facebook/react', 'stopped');
update public.runs set started_at = now() - interval '9 minutes' where id = (select run_id from third);
select ok(
  not (select public.stale(r) from public.runs r where id = (select run_id from third)),
  'AC-05: a run 9 minutes in isn''t stale'
);
update public.runs set started_at = now() - interval '11 minutes' where id = (select run_id from third);
select ok(
  (select public.stale(r) from public.runs r where id = (select run_id from third)),
  'AC-05: a run 11 minutes in is stale'
);

-- The spec's edge case: a stale run doesn't block a re-run; it's ended as
-- failed in the stage it reached, stopped without finishing.
select ok(
  (select started from public.rerun_analysis('org_a', (select analysis_id from first), 'Reading facebook/react', 'Stopped without finishing.')),
  'a stale run doesn''t count as unfinished: a re-run starts'
);
select is(
  (select state || ' / ' || failed_stage || ' / ' || message from public.runs where id = (select run_id from third)),
  'failed / fetching / Stopped without finishing.',
  'the stale run is ended as failed, in the stage it reached'
);

-- A re-run names its organization: another organization's analysis isn't
-- found, even with the secret key.
select throws_ok(
  $$select * from public.rerun_analysis('org_b', (select analysis_id from first), 'x', 'x')$$,
  'P0002', null,
  'a re-run of another organization''s analysis is refused'
);

-- D-06: members can't call the functions that write.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_test","role":"authenticated","o":{"id":"org_a"}}', true);
select throws_ok(
  $$select * from public.start_analysis('org_a', 'someone/else', 'x')$$,
  '42501', null,
  'D-06: a member can''t start an analysis directly'
);

select * from finish();
rollback;
