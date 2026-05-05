-- Public marketing: active featured placements + cover reads for anon (promos bucket).
-- DJs still use authenticated paths; this unlocks /featured for logged-out visitors.

begin;

create or replace function public.public_active_featured_tracks(p_limit integer default 24)
returns table (
  placement_id uuid,
  placement_label text,
  track_id uuid,
  title text,
  credit_artist_name text,
  genre text,
  bpm numeric,
  explicit_rating text,
  artist_display_name text,
  cover_storage_path text,
  placement_created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with candidates as (
    select
      fp.id as placement_id,
      fp.label as placement_label,
      fp.created_at as placement_created_at,
      fp.track_id,
      row_number() over (partition by fp.track_id order by fp.created_at desc) as rn
    from public.featured_placements fp
    where fp.moderation_status = 'approved'::public.approval_status
      and (fp.starts_at is null or fp.starts_at <= now())
      and (fp.ends_at is null or fp.ends_at > now())
      and public.track_is_visible_to_dj(fp.track_id)
  ),
  picked as (
    select * from candidates where rn = 1
  )
  select
    p.placement_id,
    p.placement_label,
    tr.id as track_id,
    tr.title,
    tr.credit_artist_name,
    tr.genre,
    tr.bpm,
    tr.explicit_rating::text,
    ar.display_name as artist_display_name,
    cov.storage_path as cover_storage_path,
    p.placement_created_at
  from picked p
  join public.tracks tr on tr.id = p.track_id
  join public.artists ar on ar.id = tr.artist_id
  left join lateral (
    select tf.storage_path
    from public.track_files tf
    where tf.track_id = tr.id
      and tf.pack_slot = 'cover_art'::public.pack_slot
    order by tf.created_at asc
    limit 1
  ) cov on true
  order by p.placement_created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 48);
$$;

comment on function public.public_active_featured_tracks(integer) is
  'Security definer: public catalog of currently active approved featured placements (for marketing /featured).';

revoke all on function public.public_active_featured_tracks(integer) from public;
grant execute on function public.public_active_featured_tracks(integer) to anon, authenticated;

-- Allow anonymous signed URLs only for cover art tied to an *active* featured window.
-- (No COMMENT ON POLICY here: hosted Supabase migration role often is not owner of storage.objects.)
drop policy if exists "promos_select_public_active_featured_cover" on storage.objects;

create policy "promos_select_public_active_featured_cover"
  on storage.objects for select
  to anon
  using (
    bucket_id = 'promos'
    and exists (
      select 1
      from public.track_files tf
      inner join public.featured_placements fp on fp.track_id = tf.track_id
      where tf.storage_path = name
        and tf.pack_slot = 'cover_art'::public.pack_slot
        and fp.moderation_status = 'approved'::public.approval_status
        and (fp.starts_at is null or fp.starts_at <= now())
        and (fp.ends_at is null or fp.ends_at > now())
        and public.track_is_visible_to_dj(tf.track_id)
    )
  );

commit;
