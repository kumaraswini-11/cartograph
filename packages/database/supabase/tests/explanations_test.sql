-- Spec 009's explanation cache, tested against the real table and policy
-- (plan Data, D-09). 007's every-table tests cover it too: row-level access
-- on, and a required reference to an organization. Rolled back at the end.
begin;
select plan(9);

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

-- Two organizations, each with an analysis.
insert into public.organizations (id) values ('org_a'), ('org_b');
insert into public.analyses (id, organization_id, repository) values
  ('00000000-0000-0000-0000-00000000000a', 'org_a', 'owner/a'),
  ('00000000-0000-0000-0000-00000000000b', 'org_b', 'owner/b');

-- The server writes, with the secret key's role.
set local role service_role;
insert into public.explanations
  (organization_id, analysis_id, cache_key, subject, kind, body, model, prompt_version)
values
  ('org_a', '00000000-0000-0000-0000-00000000000a', repeat('a', 64),
   'src/index.ts', 'file', 'The entry point.', 'gemini-3.6-flash', 1),
  ('org_b', '00000000-0000-0000-0000-00000000000b', repeat('a', 64),
   'src/index.ts', 'file', 'Another organization''s.', 'gemini-3.6-flash', 1);

-- FR-010: one row per key per organization. A second write of the same
-- key (two tabs racing) leaves the first.
insert into public.explanations
  (organization_id, analysis_id, cache_key, subject, kind, body, model, prompt_version)
values
  ('org_a', '00000000-0000-0000-0000-00000000000a', repeat('a', 64),
   'src/index.ts', 'file', 'A racing second write.', 'gemini-3.6-flash', 1)
on conflict (organization_id, cache_key) do nothing;
select is(
  (select body from public.explanations where organization_id = 'org_a'),
  'The entry point.',
  'a key written twice keeps one row, the first'
);

-- C-02, FR-009: an inferred role is never a surface role, whoever writes.
select throws_ok(
  $$insert into public.explanations
      (organization_id, analysis_id, cache_key, subject, kind, body, inferred_role, model, prompt_version)
    values ('org_a', '00000000-0000-0000-0000-00000000000a', repeat('c', 64),
      'app/page.tsx', 'file', 'x', 'page route', 'gemini-3.6-flash', 1)$$,
  '23514', null,
  'C-02: the database refuses a surface role as an inferred one'
);
select lives_ok(
  $$insert into public.explanations
      (organization_id, analysis_id, cache_key, subject, kind, body, inferred_role, model, prompt_version)
    values ('org_a', '00000000-0000-0000-0000-00000000000a', repeat('d', 64),
      'lib/db.ts', 'file', 'Data access.', 'data access', 'gemini-3.6-flash', 1)$$,
  'one of the fixed roles is accepted'
);
select throws_ok(
  $$insert into public.explanations
      (organization_id, analysis_id, cache_key, subject, kind, body, model, prompt_version)
    values ('org_a', '00000000-0000-0000-0000-00000000000a', 'not-a-hash',
      'src', 'box', 'x', 'gemini-3.6-flash', 1)$$,
  '23514', null,
  'a cache key is a SHA-256'
);
select throws_ok(
  $$insert into public.explanations
      (organization_id, analysis_id, cache_key, subject, kind, body, model, prompt_version)
    values ('org_a', '00000000-0000-0000-0000-00000000000b', repeat('e', 64),
      'src', 'box', 'x', 'gemini-3.6-flash', 1)$$,
  '23503', null,
  'an explanation can''t name another organization''s analysis'
);

-- 007 C-02: a member reads their own organization's explanations only.
reset role;
set local role authenticated;
select pg_temp.act_as('org_a');
select is(
  (select count(*) from public.explanations where cache_key = repeat('a', 64)),
  1::bigint,
  'a member sees one explanation for the key: their organization''s'
);
select is(
  (select body from public.explanations where cache_key = repeat('a', 64)),
  'The entry point.',
  '…and it is their own'
);
select throws_ok(
  $$insert into public.explanations
      (organization_id, analysis_id, cache_key, subject, kind, body, model, prompt_version)
    values ('org_a', '00000000-0000-0000-0000-00000000000a', repeat('f', 64),
      'src', 'box', 'x', 'gemini-3.6-flash', 1)$$,
  '42501', null,
  'D-09: a member can''t write the cache directly'
);

-- Deleting the analysis deletes what was written for it.
reset role;
delete from public.analyses where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select count(*) from public.explanations where organization_id = 'org_a'),
  0::bigint,
  'an analysis''s explanations go with it'
);

select * from finish();
rollback;
