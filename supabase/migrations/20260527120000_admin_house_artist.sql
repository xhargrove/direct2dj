-- Allow admins to own an artists row tied to their own profile (role stays admin in profiles).
-- Storage paths use auth.uid() prefix; no separate artist login or invite required.

begin;

create or replace function public.admin_ensure_house_artist()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select a.id into aid
  from public.artists a
  where a.profile_id = auth.uid()
  limit 1;

  if aid is not null then
    return aid;
  end if;

  insert into public.artists (profile_id, display_name, status)
  values (
    auth.uid(),
    'House / Admin releases',
    'active'::public.lifecycle_status
  )
  returning id into aid;

  return aid;
end;
$$;

comment on function public.admin_ensure_house_artist() is
  'Admin-only: ensures one artists row with profile_id = calling admin (no separate artist login). Used for internal DJ packs and promos.';

revoke all on function public.admin_ensure_house_artist() from public;
grant execute on function public.admin_ensure_house_artist() to authenticated;

commit;
