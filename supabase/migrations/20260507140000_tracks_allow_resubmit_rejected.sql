-- Allow owning artists to move moderation_status from rejected → pending (complete-pack resubmit).
-- Self-approve remains blocked; admins unchanged.

begin;

create or replace function public.tracks_enforce_moderation_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
      if public.is_admin(auth.uid()) then
        return new;
      end if;
      if
        old.moderation_status = 'rejected'::public.approval_status
        and new.moderation_status = 'pending'::public.approval_status
        and public.artist_owns_track(old.id, auth.uid())
      then
        return new;
      end if;
      raise exception 'Only admins can approve or reject tracks'
        using errcode = '42501';
    end if;
    return new;
  end if;

  return new;
end;
$$;

commit;
