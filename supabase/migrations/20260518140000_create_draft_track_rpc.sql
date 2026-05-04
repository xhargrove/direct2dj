begin;

-- Server-friendly draft creation: insert runs as function owner (bypasses RLS) while
-- ownership is enforced by joining artists.profile_id to auth.uid().

create or replace function public.create_draft_track()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
  tid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select a.id
  into aid
  from public.artists a
  where a.profile_id = auth.uid()
  limit 1;

  if aid is null then
    raise exception 'No artist profile for this user' using errcode = 'P0001';
  end if;

  insert into public.tracks (artist_id, title, is_draft, moderation_status)
  values (
    aid,
    'Untitled draft',
    true,
    'pending'::public.approval_status
  )
  returning id into tid;

  return tid;
end;
$$;

revoke all on function public.create_draft_track() from public;
grant execute on function public.create_draft_track() to authenticated;

comment on function public.create_draft_track() is
  'Authenticated artist: inserts a new draft track for auth.uid()''s artist row; safe while RLS insert checks are finicky from the API.';

commit;
