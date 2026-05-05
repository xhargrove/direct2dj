-- Allow self-selected signup role for DJ onboarding.
-- Security: only 'dj' is honored from signup metadata; everything else remains 'artist'.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role text := nullif(trim(coalesce(new.raw_user_meta_data->>'signup_role', '')), '');
  initial_role public.user_role := 'artist'::public.user_role;
begin
  if signup_role = 'dj' then
    initial_role := 'dj'::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    initial_role
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates profiles row at auth signup; allows signup metadata role = dj, otherwise defaults to artist.';

commit;
