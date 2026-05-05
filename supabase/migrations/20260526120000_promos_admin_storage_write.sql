-- Allow admins to insert/update/delete promos storage objects for any path (DJ pack admin upload on behalf of artists).
-- Complements promos_select_admin; artists remain limited to their own prefix via promos_insert_own_prefix.

begin;

drop policy if exists "promos_insert_admin" on storage.objects;
create policy "promos_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'promos'
    and public.is_admin(auth.uid())
  );

drop policy if exists "promos_update_admin" on storage.objects;
create policy "promos_update_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'promos'
    and public.is_admin(auth.uid())
  )
  with check (
    bucket_id = 'promos'
    and public.is_admin(auth.uid())
  );

drop policy if exists "promos_delete_admin" on storage.objects;
create policy "promos_delete_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'promos'
    and public.is_admin(auth.uid())
  );

commit;
