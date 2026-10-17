-- Spec 007's storage, tested against the real policies (plan D-06): every
-- table is read from Postgres's catalog, so a table a later migration adds
-- is covered without changing this file. Run with `supabase test db`; the
-- transaction is rolled back at the end, so nothing stays.
begin;
select plan(17);

-- Act as a signed-in member of `organization`, with a token shaped like
-- Clerk's (the o claim), the way auth.jwt() reads it.
create function pg_temp.act_as(organization text) returns void
language sql as $$
  select set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', 'user_test', 'role', 'authenticated',
      'o', json_build_object('id', organization, 'rol', 'admin')
    )::text,
    true
  );
$$;

-- Rows in every table of public whose organization isn't `own`, counted as
-- the current role sees them. organizations is its own organization's id.
create function pg_temp.rows_not_of(own text) returns bigint
language plpgsql as $$
declare
  t record;
  n bigint;
  total bigint := 0;
begin
  for t in
    select c.relname,
      exists (
        select 1 from pg_attribute a
        where a.attrelid = c.oid and a.attname = 'organization_id' and not a.attisdropped
      ) as has_organization
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format(
      'select count(*) from public.%I where %I is distinct from $1',
      t.relname,
      case when t.has_organization then 'organization_id' else 'id' end
    ) into n using own;
    total := total + n;
  end loop;
  return total;
end;
$$;

-- Two organizations, each with an analysis, a run and a result.
insert into public.organizations (id) values ('org_a'), ('org_b');
insert into public.analyses (id, organization_id, repository) values
  ('00000000-0000-0000-0000-00000000000a', 'org_a', 'owner/a'),
  ('00000000-0000-0000-0000-00000000000b', 'org_b', 'owner/b');
insert into public.runs (organization_id, analysis_id, state, failed_stage, finished_at) values
  ('org_a', '00000000-0000-0000-0000-00000000000a', 'done', null, now()),
  ('org_b', '00000000-0000-0000-0000-00000000000b', 'failed', 'fetching', now());
insert into public.results (analysis_id, organization_id, commit, parsed, detection) values
  ('00000000-0000-0000-0000-00000000000a', 'org_a', repeat('a', 40), '{}', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'org_b', repeat('b', 40), '{}', '{}');

-- AC-04, C-01: every table has row-level access enforced, all of them.
select ok(
  (select count(*) from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind in ('r', 'p')) >= 3,
  'the schema has its tables'
);
select is(
  (select count(*) from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0::bigint,
  'AC-04: every table in public has row-level access enforced'
);

-- AC-08, FR-001: every table but organizations has a required reference to
-- an organization.
select is(
  (select count(*)
   from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'organizations'
     and not exists (
       select 1
       from pg_attribute a
       join pg_constraint k on k.conrelid = c.oid and k.contype = 'f'
         and k.confrelid = 'public.organizations'::regclass
         and k.conkey = array[a.attnum]
       where a.attrelid = c.oid and a.attname = 'organization_id' and a.attnotnull
     )),
  0::bigint,
  'AC-08: every table has a required reference to an organization'
);
select col_not_null('public', 'runs', 'analysis_id', 'a run belongs to an analysis');

-- AC-03, FR-003: a member of org_a reads its own rows and nothing of org_b's,
-- in any table, without filtering (C-02).
set local role authenticated;
select pg_temp.act_as('org_a');
select is((select count(*) from public.analyses), 1::bigint, 'org_a''s member sees its analysis');
select is((select repository from public.analyses), 'owner/a', '…and it is org_a''s');
select is((select count(*) from public.runs), 1::bigint, 'org_a''s member sees its run');
select is(pg_temp.rows_not_of('org_a'), 0::bigint, 'AC-03: no table returns another organization''s row');

-- Switching the token's organization changes what comes back, same query.
select pg_temp.act_as('org_b');
select is((select repository from public.analyses), 'owner/b', 'with org_b current, org_b''s analysis');

-- A token with no organization (a pending session) sees nothing.
select set_config('request.jwt.claims', '{"sub":"user_test","role":"authenticated"}', true);
select is((select count(*) from public.analyses), 0::bigint, 'a token with no organization sees no analysis');

-- Read-only for members in 007: a write is refused, not quietly ignored.
select pg_temp.act_as('org_a');
select throws_ok(
  $$insert into public.analyses (organization_id, repository) values ('org_a', 'owner/new')$$,
  '42501', null, 'a member can''t write an analysis'
);

-- No signed-in person: nothing.
reset role;
set local role anon;
select throws_ok($$select count(*) from public.analyses$$, '42501', null, 'anon can''t read analyses');

-- AC-05, FR-004: a table a migration creates with no policy and no grant
-- has row-level access switched on by itself, and answers with nothing.
reset role;
create table public.ac05_probe (id int primary key, organization_id text);
insert into public.ac05_probe values (1, 'org_a');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.ac05_probe'::regclass),
  'AC-05: a new table has row-level access switched on by the database'
);
set local role authenticated;
select pg_temp.act_as('org_a');
select throws_ok($$select * from public.ac05_probe$$, '42501', null, 'AC-05: with no grant, nothing');
reset role;
grant select on public.ac05_probe to authenticated;
set local role authenticated;
select is((select count(*) from public.ac05_probe), 0::bigint, 'AC-05: granted but with no policy, no rows');
reset role;
drop table public.ac05_probe;

-- AC-06, FR-002: deleting an organization deletes every row it owns, in
-- every table, with the deletion webhook's role; the other is untouched.
set local role service_role;
delete from public.organizations where id = 'org_a';
reset role;
select is(
  (select count(*) from public.analyses where organization_id = 'org_a')
    + (select count(*) from public.runs where organization_id = 'org_a')
    + (select count(*) from public.results where organization_id = 'org_a'),
  0::bigint,
  'AC-06: none of the deleted organization''s rows remain'
);
select is(
  (select count(*) from public.analyses where organization_id = 'org_b'),
  1::bigint,
  'AC-06: the other organization''s rows remain'
);

select * from finish();
rollback;
