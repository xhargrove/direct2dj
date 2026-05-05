-- Admins can open a new draft for any artist without a paid submission checkout.

begin;

create or replace function public.admin_create_draft_track(p_artist_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_artist_id is null or not exists (select 1 from public.artists a where a.id = p_artist_id) then
    raise exception 'Artist not found' using errcode = 'P0001';
  end if;

  insert into public.tracks (artist_id, title, is_draft, moderation_status)
  values (
    p_artist_id,
    'Untitled draft',
    true,
    'pending'::public.approval_status
  )
  returning id into tid;

  return tid;
end;
$$;

revoke all on function public.admin_create_draft_track(uuid) from public;
grant execute on function public.admin_create_draft_track(uuid) to authenticated;

comment on function public.admin_create_draft_track(uuid) is
  'Admin-only: inserts a draft track for an artist without Stripe submission payment.';

commit;
