-- Post–db reset checks for Phase 4.5 smoke fixtures (local only).
-- Must be a single statement — `supabase db query -f` uses one prepared statement.
-- Run: npm run smoke:accounts

do $$
declare
  n int;
begin
  select count(*) into n from auth.users
  where email in (
    'smoke-artist@example.com',
    'smoke-approved-dj@example.com',
    'smoke-pending-dj@example.com',
    'smoke-suspended-dj@example.com',
    'smoke-admin@example.com',
    'smoke-inactive-artist@example.com'
  );
  if n <> 6 then
    raise exception 'verify-smoke-data: expected 6 smoke auth users, got %', n;
  end if;

  select count(*) into n from public.djs d
  inner join public.profiles p on p.id = d.profile_id
  where p.email = 'smoke-approved-dj@example.com' and d.vetting_status = 'approved';
  if n <> 1 then raise exception 'verify-smoke-data: approved DJ vetting missing'; end if;

  select count(*) into n from public.djs d
  inner join public.profiles p on p.id = d.profile_id
  where p.email = 'smoke-pending-dj@example.com' and d.vetting_status = 'pending';
  if n <> 1 then raise exception 'verify-smoke-data: pending DJ vetting missing'; end if;

  select count(*) into n from public.djs d
  inner join public.profiles p on p.id = d.profile_id
  where p.email = 'smoke-suspended-dj@example.com' and d.vetting_status = 'suspended';
  if n <> 1 then raise exception 'verify-smoke-data: suspended DJ vetting missing'; end if;

  select count(*) into n from public.track_files where track_id = 'f2000002-0000-4000-8000-000000000002'::uuid;
  if n <> 3 then raise exception 'verify-smoke-data: expected 3 track_files on main pack track, got %', n; end if;

  select count(*) into n from public.tracks t
  where t.id = 'f2000006-0000-4000-8000-000000000006'::uuid
    and not exists (select 1 from public.track_files tf where tf.track_id = t.id);
  if n <> 1 then raise exception 'verify-smoke-data: no-files visibility track misconfigured'; end if;

  select count(*) into n from storage.objects
  where bucket_id = 'promos'
    and name like 'e1000001-0000-4000-8000-000000000001/smoke-visible/%';
  if n <> 3 then
    raise exception 'verify-smoke-data: expected 3 storage.objects for smoke-visible paths, got %', n;
  end if;

  raise notice 'verify-smoke-data: all checks passed';
end $$;
