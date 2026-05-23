-- Allow anonymous Storage reads for cover art on active editorial spotlight tracks.
-- Mirrors promos_object_is_active_featured_cover (20260531190000_*).
-- Server-side cover signing still prefers SUPABASE_SERVICE_ROLE_KEY when set.

begin;

create or replace function public.promos_object_is_active_editorial_spotlight_cover(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.track_files tf
    inner join public.editorial_spotlights es on es.track_id = tf.track_id
    where tf.storage_path = p_object_name
      and tf.pack_slot = 'cover_art'::public.pack_slot
      and es.starts_at <= now()
      and (es.ends_at is null or es.ends_at > now())
      and public.track_is_visible_to_dj(tf.track_id)
  );
$$;

comment on function public.promos_object_is_active_editorial_spotlight_cover(text) is
  'True when this promos object is cover art for a track in an active editorial spotlight slot. Used by anon Storage SELECT.';

revoke all on function public.promos_object_is_active_editorial_spotlight_cover(text) from public;
grant execute on function public.promos_object_is_active_editorial_spotlight_cover(text) to anon, authenticated;

drop policy if exists "promos_select_public_active_editorial_spotlight_cover" on storage.objects;

create policy "promos_select_public_active_editorial_spotlight_cover"
  on storage.objects for select
  to anon
  using (
    bucket_id = 'promos'
    and public.promos_object_is_active_editorial_spotlight_cover(name)
  );

commit;
