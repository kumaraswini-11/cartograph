-- A run's stage changes, pushed from storage to the pages that follow them
-- (spec 008, FR-010 to FR-012, C-02 to C-04, plan D-09). Storage is the one
-- source of a run's state: a page reads it, then hears each change as
-- storage makes it, and never polls.

-- Each change of a run's stage or sentence is broadcast on two private
-- topics: the organization's, which the dashboard follows, and the
-- analysis's, which its page follows, so that page has nothing to filter.
-- The message carries the stage and its sentence, never the row (C-03).
-- Supabase's documented trigger shape: security definer, so the trigger can
-- write Realtime's messages whoever changed the run, with an empty
-- search_path, in a schema the Data API doesn't expose.
create function private.broadcast_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_topic text := 'organization:' || new.organization_id;
  message jsonb := jsonb_build_object(
    'analysisId', new.analysis_id,
    'stage', new.state,
    'message', new.message
  );
begin
  perform realtime.send(message, 'stage', organization_topic, true);
  perform realtime.send(
    message,
    'stage',
    organization_topic || ':analysis:' || new.analysis_id,
    true
  );
  return null;
end;
$$;

revoke execute on function private.broadcast_stage() from public, anon, authenticated;

create trigger runs_broadcast_stage
after insert or update of state, message on public.runs
for each row
execute function private.broadcast_stage();

-- Who may hear a run's stages is a policy, the same as who may read the run
-- (C-04, FR-012): a member hears only topics under their own
-- organization's, read from their token as every read policy does. The
-- topic's prefix is the organization, so the check is one comparison and
-- needs no join (Supabase: Realtime policies run when a channel is joined,
-- and a complex one slows every join). `starts_with`, not `like`: Clerk's
-- IDs hold `_`, which `like` reads as any character. There is no insert
-- policy, so a member can listen but not send.
create policy "Members hear their organization's stages"
on realtime.messages for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (
    (select realtime.topic())
      = 'organization:' || ((select auth.jwt()) -> 'o' ->> 'id')
    or starts_with(
      (select realtime.topic()),
      'organization:' || ((select auth.jwt()) -> 'o' ->> 'id') || ':'
    )
  )
);
