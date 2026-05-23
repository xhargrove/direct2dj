-- Co-admin (upload operator): upload and edit DJ packs in Backstage without full admin powers.

begin;

create or replace function public.is_co_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'co_admin'::public.user_role
  );
$$;

comment on function public.is_co_admin(uuid) is
  'True when profile role is co_admin (upload-only Backstage operator).';

grant execute on function public.is_co_admin(uuid) to authenticated;

/** Full admin or co-admin — track upload, storage, draft creation (not payments/DJ vetting). */
create or replace function public.is_upload_operator(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin(uid) or public.is_co_admin(uid);
$$;

comment on function public.is_upload_operator(uuid) is
  'True for profiles.role admin or co_admin; used for DJ pack upload RLS and RPCs.';

grant execute on function public.is_upload_operator(uuid) to authenticated;

-- Draft creation + house artist (upload tooling)
create or replace function public.admin_ensure_house_artist()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  if auth.uid() is null or not public.is_upload_operator(auth.uid()) then
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

create or replace function public.admin_create_draft_track(p_artist_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if auth.uid() is null or not public.is_upload_operator(auth.uid()) then
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

-- Tracks + files: co-admin can list and edit packs for upload QA
drop policy if exists "tracks_select_scope" on public.tracks;
create policy "tracks_select_scope"
  on public.tracks for select
  to authenticated
  using (
    public.is_upload_operator(auth.uid())
    or public.artist_owns_track(id, auth.uid())
    or public.track_is_visible_to_dj(id)
  );

drop policy if exists "tracks_update_owner_or_admin" on public.tracks;
create policy "tracks_update_owner_or_admin"
  on public.tracks for update
  to authenticated
  using (public.artist_owns_track(id, auth.uid()) or public.is_upload_operator(auth.uid()))
  with check (public.artist_owns_track(id, auth.uid()) or public.is_upload_operator(auth.uid()));

drop policy if exists "tracks_delete_owner_or_admin" on public.tracks;
create policy "tracks_delete_owner_or_admin"
  on public.tracks for delete
  to authenticated
  using (public.is_admin(auth.uid()) or public.artist_owns_track(id, auth.uid()));

drop policy if exists "track_files_select_scope" on public.track_files;
create policy "track_files_select_scope"
  on public.track_files for select
  to authenticated
  using (
    public.is_upload_operator(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or public.track_is_visible_to_dj(track_id)
  );

drop policy if exists "track_files_write_owner_artist_or_admin" on public.track_files;
create policy "track_files_write_owner_artist_or_admin"
  on public.track_files for insert
  to authenticated
  with check (
    public.is_upload_operator(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
  );

drop policy if exists "track_files_update_owner_or_admin" on public.track_files;
create policy "track_files_update_owner_or_admin"
  on public.track_files for update
  to authenticated
  using (public.artist_owns_track(track_id, auth.uid()) or public.is_upload_operator(auth.uid()))
  with check (public.artist_owns_track(track_id, auth.uid()) or public.is_upload_operator(auth.uid()));

drop policy if exists "track_files_delete_owner_or_admin" on public.track_files;
create policy "track_files_delete_owner_or_admin"
  on public.track_files for delete
  to authenticated
  using (public.artist_owns_track(track_id, auth.uid()) or public.is_upload_operator(auth.uid()));

-- Admin-only columns still require full admin (catalog_active, admin_tags, etc.)
create or replace function public.tracks_protect_admin_only_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin(auth.uid()) then
    return new;
  end if;
  new.rejection_reason := old.rejection_reason;
  new.catalog_active := old.catalog_active;
  new.admin_tags := old.admin_tags;
  return new;
end;
$$;

-- Promos storage for pack uploads
drop policy if exists "promos_select_admin" on storage.objects;
create policy "promos_select_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'promos'
    and public.is_upload_operator(auth.uid())
  );

drop policy if exists "promos_insert_admin" on storage.objects;
create policy "promos_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'promos'
    and public.is_upload_operator(auth.uid())
  );

drop policy if exists "promos_update_admin" on storage.objects;
create policy "promos_update_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'promos'
    and public.is_upload_operator(auth.uid())
  )
  with check (
    bucket_id = 'promos'
    and public.is_upload_operator(auth.uid())
  );

drop policy if exists "promos_delete_admin" on storage.objects;
create policy "promos_delete_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'promos'
    and public.is_upload_operator(auth.uid())
  );

commit;
