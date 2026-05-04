-- Allow profile role changes when auth.uid() is null (e.g. supabase/seed.sql / superuser
-- maintenance). Authenticated sessions still require admin via existing logic.

begin;

create or replace function public.profiles_guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    if auth.uid() is not null and not public.is_admin(auth.uid()) then
      raise exception 'Only admins can change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

commit;
