-- Artist analytics dashboard: DJ city (optional), timeline, genre/city breakdowns,
-- play totals, featured campaign stats, per-track analytics RPCs.

begin;

alter table public.djs
  add column if not exists city text;

comment on column public.djs.city is 'Optional city for anonymous aggregate analytics; never required.';

-- ---------------------------------------------------------------------------
-- Portfolio-level (current artist)
-- ---------------------------------------------------------------------------

-- Remote may have older RETURN TABLE shapes; CREATE OR REPLACE cannot change OUT params.
drop function if exists public.artist_download_timeline(integer);
drop function if exists public.artist_genre_stats();
drop function if exists public.artist_city_stats(integer);
drop function if exists public.artist_play_stats();
drop function if exists public.artist_featured_campaign_stats();
drop function if exists public.artist_track_analytics(uuid);
drop function if exists public.artist_track_download_timeline(uuid, integer);
drop function if exists public.artist_track_featured_rows(uuid);
drop function if exists public.artist_track_supporters(uuid, integer);
drop function if exists public.artist_track_feedback_list(uuid, integer);
drop function if exists public.artist_engagement_counts();

create or replace function public.artist_download_timeline(p_days int default 90)
returns table (
  bucket_date date,
  download_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
  days int := greatest(7, least(coalesce(p_days, 90), 365));
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    (date_trunc('day', dl.created_at))::date as bucket_date,
    count(*)::bigint
  from public.downloads dl
  inner join public.tracks t on t.id = dl.track_id
  where t.artist_id = aid
    and dl.created_at >= (now() - (days || ' days')::interval)
  group by 1
  order by 1 asc;
end;
$$;

create or replace function public.artist_genre_stats()
returns table (
  genre_key text,
  download_count bigint,
  rating_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  with genres as (
    select distinct coalesce(nullif(trim(t.genre), ''), '—') as g
    from public.tracks t
    where t.artist_id = aid
  )
  select
    genres.g::text,
    (
      select count(*)::bigint
      from public.downloads dl
      inner join public.tracks t2 on t2.id = dl.track_id
      where t2.artist_id = aid
        and coalesce(nullif(trim(t2.genre), ''), '—') = genres.g
    ),
    (
      select count(*)::bigint
      from public.ratings r
      inner join public.tracks t2 on t2.id = r.track_id
      where t2.artist_id = aid
        and coalesce(nullif(trim(t2.genre), ''), '—') = genres.g
    )
  from genres
  order by genres.g asc;
end;
$$;

create or replace function public.artist_city_stats(p_limit int default 15)
returns table (
  city_key text,
  download_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
  lim int := greatest(1, least(coalesce(p_limit, 15), 50));
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    trim(d.city)::text as city_key,
    count(dl.id)::bigint as download_count
  from public.downloads dl
  inner join public.tracks t on t.id = dl.track_id
  inner join public.djs d on d.id = dl.dj_id
  where t.artist_id = aid
    and d.city is not null
    and btrim(d.city) <> ''
  group by trim(d.city)
  order by download_count desc
  limit lim;
end;
$$;

create or replace function public.artist_play_stats()
returns table (
  report_rows bigint,
  play_count_sum bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    count(pr.id)::bigint,
    coalesce(sum(pr.play_count), 0)::bigint
  from public.play_reports pr
  inner join public.tracks t on t.id = pr.track_id
  where t.artist_id = aid;
end;
$$;

create or replace function public.artist_featured_campaign_stats()
returns table (
  placement_id uuid,
  track_id uuid,
  track_title text,
  label text,
  starts_at timestamptz,
  ends_at timestamptz,
  moderation_status public.approval_status,
  downloads_in_window bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    fp.id,
    fp.track_id,
    coalesce(nullif(trim(t.title), ''), 'Untitled'),
    fp.label,
    fp.starts_at,
    fp.ends_at,
    fp.moderation_status,
    case
      when fp.moderation_status = 'approved'::public.approval_status then (
        select count(*)::bigint
        from public.downloads dl
        where dl.track_id = fp.track_id
          and (fp.starts_at is null or dl.created_at >= fp.starts_at)
          and (fp.ends_at is null or dl.created_at <= fp.ends_at)
      )
      else 0::bigint
    end as downloads_in_window
  from public.featured_placements fp
  inner join public.tracks t on t.id = fp.track_id
  where t.artist_id = aid
  order by fp.created_at desc
  limit 100;
end;
$$;

-- ---------------------------------------------------------------------------
-- Single track (must own track)
-- ---------------------------------------------------------------------------

create or replace function public.artist_track_analytics(p_track_id uuid)
returns table (
  downloads_total bigint,
  ratings_count bigint,
  avg_rating numeric,
  feedback_count bigint,
  play_reports_rows bigint,
  play_count_sum bigint,
  downloads_during_featured bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::bigint from public.downloads dl where dl.track_id = p_track_id),
    (select count(*)::bigint from public.ratings r where r.track_id = p_track_id),
    (select round(avg(r.score)::numeric, 2) from public.ratings r where r.track_id = p_track_id),
    (select count(*)::bigint from public.feedback f where f.track_id = p_track_id),
    (select count(*)::bigint from public.play_reports pr where pr.track_id = p_track_id),
    (select coalesce(sum(pr.play_count), 0)::bigint from public.play_reports pr where pr.track_id = p_track_id),
    (
      select count(*)::bigint
      from public.downloads dl
      where dl.track_id = p_track_id
        and exists (
          select 1
          from public.featured_placements fp
          where fp.track_id = p_track_id
            and fp.moderation_status = 'approved'::public.approval_status
            and (fp.starts_at is null or dl.created_at >= fp.starts_at)
            and (fp.ends_at is null or dl.created_at <= fp.ends_at)
        )
    );
end;
$$;

create or replace function public.artist_track_download_timeline(p_track_id uuid, p_days int default 90)
returns table (
  bucket_date date,
  download_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
  days int := greatest(7, least(coalesce(p_days, 90), 365));
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    (date_trunc('day', dl.created_at))::date,
    count(*)::bigint
  from public.downloads dl
  where dl.track_id = p_track_id
    and dl.created_at >= (now() - (days || ' days')::interval)
  group by 1
  order by 1 asc;
end;
$$;

create or replace function public.artist_track_featured_rows(p_track_id uuid)
returns table (
  placement_id uuid,
  label text,
  starts_at timestamptz,
  ends_at timestamptz,
  moderation_status public.approval_status,
  downloads_in_window bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    fp.id,
    fp.label,
    fp.starts_at,
    fp.ends_at,
    fp.moderation_status,
    case
      when fp.moderation_status = 'approved'::public.approval_status then (
        select count(*)::bigint
        from public.downloads dl
        where dl.track_id = p_track_id
          and (fp.starts_at is null or dl.created_at >= fp.starts_at)
          and (fp.ends_at is null or dl.created_at <= fp.ends_at)
      )
      else 0::bigint
    end
  from public.featured_placements fp
  where fp.track_id = p_track_id
  order by fp.created_at desc;
end;
$$;

create or replace function public.artist_track_supporters(p_track_id uuid, p_limit int default 40)
returns table (
  dj_id uuid,
  dj_label text,
  downloaded boolean,
  rated boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  with involved as (
    select distinct dj_id from public.downloads where track_id = p_track_id
    union
    select distinct dj_id from public.ratings where track_id = p_track_id
  )
  select
    d.id,
    (case
      when d.allow_artist_contact then d.display_name
      else 'DJ #' || substring(replace(d.id::text, '-', ''), 1, 8)
    end)::text,
    exists (select 1 from public.downloads dl where dl.track_id = p_track_id and dl.dj_id = d.id),
    exists (select 1 from public.ratings r where r.track_id = p_track_id and r.dj_id = d.id)
  from involved i
  inner join public.djs d on d.id = i.dj_id
  order by d.id
  limit lim;
end;
$$;

create or replace function public.artist_track_feedback_list(p_track_id uuid, p_limit int default 30)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  moderation_status public.approval_status,
  dj_label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
  lim int := greatest(1, least(coalesce(p_limit, 30), 100));
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.body,
    f.created_at,
    f.moderation_status,
    (case
      when d.allow_artist_contact then d.display_name
      else 'DJ #' || substring(replace(d.id::text, '-', ''), 1, 8)
    end)::text
  from public.feedback f
  inner join public.djs d on d.id = f.dj_id
  where f.track_id = p_track_id
  order by f.created_at desc
  limit lim;
end;
$$;

comment on function public.artist_download_timeline(int) is 'Artist-only: daily download counts for owned tracks.';
comment on function public.artist_genre_stats() is 'Artist-only: downloads and ratings counts by track genre.';
comment on function public.artist_city_stats(int) is 'Artist-only: downloads grouped by djs.city when set.';
comment on function public.artist_play_stats() is 'Artist-only: total reported plays across owned tracks.';
comment on function public.artist_featured_campaign_stats() is 'Artist-only: featured placements with downloads-in-window.';
comment on function public.artist_track_analytics(uuid) is 'Artist-only: metrics for one owned track.';
comment on function public.artist_track_download_timeline(uuid, int) is 'Artist-only: daily downloads for one track.';
comment on function public.artist_track_featured_rows(uuid) is 'Artist-only: featured rows + in-window downloads.';
comment on function public.artist_track_supporters(uuid, int) is 'Artist-only: DJs who downloaded or rated.';
comment on function public.artist_track_feedback_list(uuid, int) is 'Artist-only: feedback for one track with masked DJ.';

grant execute on function public.artist_download_timeline(int) to authenticated;
grant execute on function public.artist_genre_stats() to authenticated;
grant execute on function public.artist_city_stats(int) to authenticated;
grant execute on function public.artist_play_stats() to authenticated;
grant execute on function public.artist_featured_campaign_stats() to authenticated;

create or replace function public.artist_engagement_counts()
returns table (
  distinct_supporter_djs bigint,
  feedback_comments bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    (
      select count(*)::bigint
      from (
        select dl.dj_id
        from public.downloads dl
        inner join public.tracks t on t.id = dl.track_id
        where t.artist_id = aid
        union
        select r.dj_id
        from public.ratings r
        inner join public.tracks t on t.id = r.track_id
        where t.artist_id = aid
      ) u
    ),
    (
      select count(*)::bigint
      from public.feedback f
      inner join public.tracks t on t.id = f.track_id
      where t.artist_id = aid
    );
end;
$$;

comment on function public.artist_engagement_counts() is 'Artist-only: distinct DJs with download or rating; total feedback rows.';

grant execute on function public.artist_engagement_counts() to authenticated;
grant execute on function public.artist_track_analytics(uuid) to authenticated;
grant execute on function public.artist_track_download_timeline(uuid, int) to authenticated;
grant execute on function public.artist_track_featured_rows(uuid) to authenticated;
grant execute on function public.artist_track_supporters(uuid, int) to authenticated;
grant execute on function public.artist_track_feedback_list(uuid, int) to authenticated;

commit;
