-- DJ discovery: catalog visibility includes non-draft packs; DJs may read promo objects for visible tracks;
-- aggregated feed query for sorting (downloads / ratings) without weakening per-row download RLS.

begin;

-- Approved catalog tracks exposed to DJs must be submitted packs (not drafts).
create or replace function public.track_is_visible_to_dj(p_track_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tracks tr
    join public.artists ar on ar.id = tr.artist_id
    where tr.id = p_track_id
      and tr.moderation_status = 'approved'::public.approval_status
      and tr.catalog_active = true
      and tr.is_draft = false
      and ar.status = 'active'::public.lifecycle_status
  );
$$;

-- DJs (and admins) can read promo objects that belong to a catalog-visible track file row.
drop policy if exists "promos_select_dj_visible_track_file" on storage.objects;

create policy "promos_select_dj_visible_track_file"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'promos'
    and public.current_dj_id() is not null
    and exists (
      select 1
      from public.track_files tf
      join public.tracks tr on tr.id = tf.track_id
      where tf.storage_path = name
        and public.track_is_visible_to_dj(tr.id)
    )
  );

-- (No COMMENT ON POLICY for storage.objects: `db push` role is not table owner; see migration header.)

-- Aggregated catalog listing for feed (sort by ratings/downloads across all DJs).
create or replace function public.dj_catalog_feed(
  p_search text default null,
  p_genre text default null,
  p_bpm_min numeric default null,
  p_bpm_max numeric default null,
  p_explicit text default null,
  p_sort text default 'newest',
  p_exclude_ids uuid[] default '{}'::uuid[],
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  track_id uuid,
  title text,
  credit_artist_name text,
  genre text,
  bpm numeric,
  musical_key text,
  explicit_rating public.explicit_rating,
  release_date date,
  created_at timestamptz,
  artist_display_name text,
  cover_storage_path text,
  download_count bigint,
  rating_avg numeric,
  rating_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 24), 100));
  off int := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if public.current_dj_id() is null and not public.is_admin(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  with base as (
    select
      t.id as tid,
      t.title,
      t.credit_artist_name,
      t.genre,
      t.bpm,
      t.musical_key,
      t.explicit_rating,
      t.release_date,
      t.created_at,
      ar.display_name as artist_display_name,
      (
        select tf.storage_path
        from public.track_files tf
        where tf.track_id = t.id
          and tf.pack_slot = 'cover_art'::public.pack_slot
        limit 1
      ) as cover_storage_path,
      (select count(*)::bigint from public.downloads d where d.track_id = t.id) as download_count,
      (select round(avg(r.score)::numeric, 2) from public.ratings r where r.track_id = t.id) as rating_avg,
      (select count(*)::bigint from public.ratings r where r.track_id = t.id) as rating_count
    from public.tracks t
    join public.artists ar on ar.id = t.artist_id
    where public.track_is_visible_to_dj(t.id)
      and (cardinality(p_exclude_ids) = 0 or not (t.id = any (p_exclude_ids)))
      and (
        p_search is null
        or btrim(p_search) = ''
        or t.title ilike '%' || btrim(p_search) || '%'
        or t.credit_artist_name ilike '%' || btrim(p_search) || '%'
        or ar.display_name ilike '%' || btrim(p_search) || '%'
      )
      and (
        p_genre is null
        or btrim(p_genre) = ''
        or t.genre ilike '%' || btrim(p_genre) || '%'
      )
      and (p_bpm_min is null or (t.bpm is not null and t.bpm >= p_bpm_min))
      and (p_bpm_max is null or (t.bpm is not null and t.bpm <= p_bpm_max))
      and (
        p_explicit is null
        or btrim(p_explicit) = ''
        or (
          trim(lower(btrim(p_explicit))) in ('explicit', 'clean')
          and t.explicit_rating = trim(lower(btrim(p_explicit)))::public.explicit_rating
        )
      )
  )
  select
    b.tid,
    b.title,
    b.credit_artist_name,
    b.genre,
    b.bpm,
    b.musical_key,
    b.explicit_rating,
    b.release_date,
    b.created_at,
    b.artist_display_name,
    b.cover_storage_path,
    b.download_count,
    b.rating_avg,
    b.rating_count
  from base b
  order by
    case when coalesce(trim(lower(p_sort)), 'newest') = 'downloads' then b.download_count end desc nulls last,
    case when coalesce(trim(lower(p_sort)), 'newest') = 'rating' then b.rating_avg end desc nulls last,
    case
      when coalesce(trim(lower(p_sort)), 'newest') in ('downloads', 'rating') then null
      else coalesce(b.release_date::timestamptz, b.created_at)
    end desc nulls last,
    b.created_at desc,
    b.title asc
  limit lim
  offset off;
end;
$$;

comment on function public.dj_catalog_feed is
  'DJ/admin: returns catalog-visible tracks with aggregate stats for discovery sorting. '
  'Does not expose individual other-DJ download rows; counts are global.';

grant execute on function public.dj_catalog_feed(
  text, text, numeric, numeric, text, text, uuid[], int, int
) to authenticated;

commit;
