-- Tighten catalog rules:
-- - Non-admins cannot set or change tracks.moderation_status (artists cannot self-approve).
-- - Non-admin inserts always store moderation_status = pending (cannot insert as approved).
-- - track_files.storage_path must start with auth.uid()/ so rows cannot point at another user's objects.
-- - auth.uid() IS NULL skips checks (service role / privileged server paths); app code must not bypass RLS.

begin;

-- ---------------------------------------------------------------------------
-- tracks.moderation_status: only admins may set or change it
-- ---------------------------------------------------------------------------

create or replace function public.tracks_enforce_moderation_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role / no JWT: do not apply end-user rules here
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_admin(auth.uid()) then
      new.moderation_status := 'pending'::public.approval_status;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.moderation_status is distinct from new.moderation_status then
      if not public.is_admin(auth.uid()) then
        raise exception 'Only admins can approve or reject tracks'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

create trigger tracks_enforce_moderation_rules
  before insert or update on public.tracks
  for each row execute function public.tracks_enforce_moderation_rules();

comment on function public.tracks_enforce_moderation_rules() is
  'Forces pending on non-admin insert; only admins may change moderation_status.';

-- ---------------------------------------------------------------------------
-- track_files.storage_path: must live under the authenticated user prefix
-- ---------------------------------------------------------------------------

create or replace function public.track_files_enforce_storage_path_prefix()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin(auth.uid()) then
    return new;
  end if;

  uid := auth.uid()::text;
  if new.storage_path is null
     or new.storage_path not like (uid || '/%') then
    raise exception 'track_files.storage_path must start with your user id prefix (your_uuid/...)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger track_files_enforce_storage_path_prefix
  before insert or update on public.track_files
  for each row execute function public.track_files_enforce_storage_path_prefix();

comment on function public.track_files_enforce_storage_path_prefix() is
  'Non-admins must use storage paths under their auth uid prefix (matches promos bucket layout).';

-- ---------------------------------------------------------------------------
-- Document one rating per DJ per track (enforced by unique constraint)
-- ---------------------------------------------------------------------------

comment on constraint ratings_track_dj_unique on public.ratings is
  'DJ cannot rate the same track twice; use UPDATE to change score.';

commit;
