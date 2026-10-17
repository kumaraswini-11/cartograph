-- Row-level access is on by default, not per table (spec 007, C-01, plan
-- D-02), and nothing is granted by default (D-03). After this migration, a
-- table created in public has row-level access switched on by the database
-- itself, and no role can reach it until a migration grants it.

-- A schema the Data API doesn't expose, for functions that must not be
-- callable over it (Supabase: a security definer function in an exposed
-- schema "is callable over the Data API with the creator's privileges").
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Supabase's documented event trigger, as published (Supabase: event
-- triggers), moved into private. Applies to tables created after it.
create or replace function private.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
      and cmd.schema_name in ('public')
      and cmd.schema_name not in ('pg_catalog', 'information_schema')
      and cmd.schema_name not like 'pg_toast%'
      and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
          raise;
      end;
    else
      raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$$;

revoke execute on function private.rls_auto_enable() from public, anon, authenticated;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
on ddl_command_end
when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
execute function private.rls_auto_enable();

-- No automatic grants on what's created in public from here on (Supabase:
-- securing your API, the platform's coming default). Each table grants what
-- it needs in its own migration; until then it answers with nothing
-- (spec 007, FR-004). All privileges, not only Supabase's four: the
-- platform's default grant is all of them, and the rest include TRUNCATE,
-- which row-level access doesn't govern.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated, service_role;
