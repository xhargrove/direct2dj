-- Backfill role for users who signed up as DJs before role-aware profile creation shipped.
-- Uses auth.users.raw_user_meta_data.signup_role = 'dj' as the source of truth.

begin;

update public.profiles p
set role = 'dj'::public.user_role,
    updated_at = now()
where p.role = 'artist'::public.user_role
  and exists (
    select 1
    from auth.users u
    where u.id = p.id
      and coalesce(u.raw_user_meta_data->>'signup_role', '') = 'dj'
  );

commit;
