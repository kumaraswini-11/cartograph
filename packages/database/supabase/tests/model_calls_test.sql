-- Spec 012's model calls, tested against the real table and policy (plan
-- Data, D-05). 007's every-table tests cover it too: row-level access on,
-- and a required reference to an organization. Rolled back at the end.
begin;
select plan(6);

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

insert into public.organizations (id) values ('org_a'), ('org_b');

-- The server writes, with the secret key's role.
set local role service_role;
insert into public.model_calls (organization_id, kind, called_at) values
  ('org_a', 'explanation', now() - interval '2 hours'),
  ('org_a', 'chat', now()),
  ('org_b', 'chat', now());

select throws_ok(
  $$insert into public.model_calls (organization_id, kind)
    values ('org_a', 'summary')$$,
  '23514', null,
  'a call is an explanation or a chat answer'
);

-- 007 C-02: a member counts their own organization's calls only.
reset role;
set local role authenticated;
select pg_temp.act_as('org_a');
select is(
  (select count(*) from public.model_calls),
  2::bigint,
  'a member sees their organization''s calls only'
);
select is(
  (select count(*) from public.model_calls
    where called_at > now() - interval '1 hour'),
  1::bigint,
  'FR-007: the calls within a window are counted'
);
select throws_ok(
  $$insert into public.model_calls (organization_id, kind)
    values ('org_a', 'chat')$$,
  '42501', null,
  'D-05: a member can''t write a call directly'
);
select is(
  (select count(*) from public.model_calls where organization_id = 'org_b'),
  0::bigint,
  'another organization''s calls are invisible'
);

-- Deleting the organization deletes its calls.
reset role;
delete from public.organizations where id = 'org_a';
select is(
  (select count(*) from public.model_calls where organization_id = 'org_a'),
  0::bigint,
  'an organization''s calls go with it'
);

select * from finish();
rollback;
