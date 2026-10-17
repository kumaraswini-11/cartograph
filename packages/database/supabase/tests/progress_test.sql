-- Spec 008's pushed progress, tested against the real trigger and policy
-- (plan D-09): what a stage change broadcasts, and who may hear it (AC-06,
-- FR-012, C-04). Realtime checks a channel's access by reading
-- realtime.messages as the joining member, with the channel's topic set,
-- which is what these tests do. Rolled back at the end.
begin;
select plan(11);

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

-- What a member joining `topic` may read, as Realtime asks it.
create function pg_temp.heard_on(topic text) returns bigint
language plpgsql as $$
declare
  n bigint;
begin
  perform set_config('realtime.topic', topic, true);
  select count(*) into n from realtime.messages m where m.topic = heard_on.topic;
  return n;
end;
$$;

-- Runs for org_a, and for org_ab, whose ID starts with org_a's.
set local role service_role;
create temporary table a on commit drop as
  select * from public.start_analysis('org_a', 'expressjs/express', 'Reading expressjs/express''s default branch');
create temporary table ab on commit drop as
  select * from public.start_analysis('org_ab', 'facebook/react', 'Reading');
select public.advance_run((select run_id from a), 'parsing', 'Parsing expressjs/express');
reset role;
grant select on a to authenticated;

-- FR-011, C-03: each stage change is broadcast on both topics, carrying
-- the stage and its sentence, not the run's record.
select is(
  (select count(*) from realtime.messages where topic = 'organization:org_a'),
  2::bigint,
  'the organization''s topic hears the start and the next stage'
);
select is(
  (select count(*) from realtime.messages
   where topic = 'organization:org_a:analysis:' || (select analysis_id from a)),
  2::bigint,
  'the analysis''s topic hears them too'
);
-- Realtime adds the message's own id to what it sends; the rest is ours.
select is(
  (select payload - 'id' from realtime.messages
   where topic = 'organization:org_a:analysis:' || (select analysis_id from a)
   order by inserted_at desc, id desc limit 1),
  jsonb_build_object(
    'analysisId', (select analysis_id from a),
    'stage', 'parsing',
    'message', 'Parsing expressjs/express'
  ),
  'C-03: a push is the stage and its sentence, never the record'
);
select ok(
  (select bool_and(private and event = 'stage' and extension = 'broadcast')
   from realtime.messages where topic like 'organization:org_a%'),
  'every push is a private broadcast'
);

-- FR-012, C-04, AC-06: who may hear them is the read policy's rule.
set local role authenticated;
select pg_temp.act_as('org_a');
select is(
  pg_temp.heard_on('organization:org_a:analysis:' || (select analysis_id from a)),
  2::bigint,
  'a member hears their own analysis''s stages'
);
select is(
  pg_temp.heard_on('organization:org_a'),
  2::bigint,
  'and their organization''s, on the dashboard'
);
select is(
  pg_temp.heard_on('organization:org_ab'),
  0::bigint,
  'an organization whose ID starts with theirs is still another one'
);

select pg_temp.act_as('org_b');
select is(
  pg_temp.heard_on('organization:org_a:analysis:' || (select analysis_id from a)),
  0::bigint,
  'AC-06: another organization''s member hears nothing of the analysis'
);
select is(
  pg_temp.heard_on('organization:org_a'),
  0::bigint,
  'AC-06: nor of the organization'
);

select set_config('request.jwt.claims', '{"sub":"user_test","role":"authenticated"}', true);
select is(
  pg_temp.heard_on('organization:org_a'),
  0::bigint,
  'a token with no organization hears nothing'
);

-- Members listen; they don't send.
select pg_temp.act_as('org_a');
select throws_ok(
  $$insert into realtime.messages (topic, extension, payload, event, private)
    values ('organization:org_a', 'broadcast', '{}', 'stage', true)$$,
  '42501', null,
  'a member can''t send on their own organization''s topic'
);

select * from finish();
rollback;
