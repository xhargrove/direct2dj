-- Fix /featured cover images for anonymous visitors.
-- The storage policy subquery read public.track_files under the anon role; track_files RLS is
-- authenticated-only, so EXISTS was always false and createSignedUrl returned "Object not found".
-- Delegate the check to a small SECURITY DEFINER function (same logic as before).

begin;

create or replace function public.promos_object_is_active_featured_cover(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.track_files tf
    inner join public.featured_placements fp on fp.track_id = tf.track_id
    where tf.storage_path = p_object_name
      and tf.pack_slot = 'cover_art'::public.pack_slot
      and fp.moderation_status = 'approved'::public.approval_status
      and (fp.starts_at is null or fp.starts_at <= now())
      and (fp.ends_at is null or fp.ends_at > now())
      and public.track_is_visible_to_dj(tf.track_id)
  );
$$;

comment on function public.promos_object_is_active_featured_cover(text) is
  'True when this promos object path is cover art for a track in an active approved featured window. Used by anon Storage SELECT (track_files is not readable by anon).';

revoke all on function public.promos_object_is_active_featured_cover(text) from public;
grant execute on function public.promos_object_is_active_featured_cover(text) to anon, authenticated;

drop policy if exists "promos_select_public_active_featured_cover" on storage.objects;

create policy "promos_select_public_active_featured_cover"
  on storage.objects for select
  to anon
  using (
    bucket_id = 'promos'
    and public.promos_object_is_active_featured_cover(name)
  );

commit;
