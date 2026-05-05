-- Allow admins to use per-track analytics RPCs (same aggregates as artists) and roll up engagement for the admin tracks list.

begin;

-- ---------------------------------------------------------------------------
-- artist_track_analytics: artist owns track OR admin
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
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if public.is_admin(auth.uid()) then
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  else
    if aid is null then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
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

comment on function public.artist_track_analytics(uuid) is
  'Metrics for one track: artist must own it, or caller must be admin.';

-- ---------------------------------------------------------------------------
-- artist_track_download_timeline
-- ---------------------------------------------------------------------------

create or replace function public.artist_track_download_timeline(p_track_id uuid, p_days int default 90)
returns table (
  bucket_date date,
  download_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  aid uuid := public.current_artist_id();
  days int := greatest(7, least(coalesce(p_days, 90), 365));
begin
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if public.is_admin(auth.uid()) then
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  else
    if aid is null then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
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

comment on function public.artist_track_download_timeline(uuid, int) is
  'Daily downloads for one track: owning artist or admin.';

-- ---------------------------------------------------------------------------
-- artist_track_featured_rows
-- ---------------------------------------------------------------------------

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
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if public.is_admin(auth.uid()) then
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  else
    if aid is null then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
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

comment on function public.artist_track_featured_rows(uuid) is
  'Featured placements for one track: owning artist or admin.';

-- ---------------------------------------------------------------------------
-- artist_track_supporters (admin sees display names; artists keep privacy mask)
-- ---------------------------------------------------------------------------

create or replace function public.artist_track_supporters(p_track_id uuid, p_limit int default 40)
returns table (
  dj_id uuid,
  dj_label text,
  downloaded boolean,
  rated boolean,
  dj_tier public.dj_tier,
  city text,
  state text
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
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if public.is_admin(auth.uid()) then
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  else
    if aid is null then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  end if;

  return query
  with involved as (
    select distinct dj_id from public.downloads where track_id = p_track_id
    union
    select distinct dj_id from public.ratings where track_id = p_track_id
  )
  select
    d.id,
    (
      case
        when public.is_admin(auth.uid()) then
          coalesce(nullif(trim(d.display_name), ''), 'DJ #' || substring(replace(d.id::text, '-', ''), 1, 8))
        when d.allow_artist_contact then d.display_name
        else 'DJ #' || substring(replace(d.id::text, '-', ''), 1, 8)
      end
    )::text,
    exists (select 1 from public.downloads dl where dl.track_id = p_track_id and dl.dj_id = d.id),
    exists (select 1 from public.ratings r where r.track_id = p_track_id and r.dj_id = d.id),
    d.dj_tier,
    d.city,
    d.state
  from involved i
  inner join public.djs d on d.id = i.dj_id
  order by d.id
  limit lim;
end;
$$;

comment on function public.artist_track_supporters(uuid, int) is
  'DJs who downloaded or rated: artist (masked labels) or admin (full display names).';

-- ---------------------------------------------------------------------------
-- artist_track_feedback_list
-- ---------------------------------------------------------------------------

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
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if public.is_admin(auth.uid()) then
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  else
    if aid is null then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
    if not exists (select 1 from public.tracks tr where tr.id = p_track_id and tr.artist_id = aid) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
  end if;

  return query
  select
    f.id,
    f.body,
    f.created_at,
    f.moderation_status,
    (
      case
        when public.is_admin(auth.uid()) then
          coalesce(nullif(trim(d.display_name), ''), 'DJ #' || substring(replace(d.id::text, '-', ''), 1, 8))
        when d.allow_artist_contact then d.display_name
        else 'DJ #' || substring(replace(d.id::text, '-', ''), 1, 8)
      end
    )::text
  from public.feedback f
  inner join public.djs d on d.id = f.dj_id
  where f.track_id = p_track_id
  order by f.created_at desc
  limit lim;
end;
$$;

comment on function public.artist_track_feedback_list(uuid, int) is
  'Feedback for one track: artist (masked DJ) or admin (full display names).';

-- ---------------------------------------------------------------------------
-- Admin tracks table: one round-trip rollups
-- ---------------------------------------------------------------------------

create or replace function public.admin_tracks_engagement_rollups()
returns table (
  track_id uuid,
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
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  -- Qualify every track_id (e.g. d.track_id, not bare track_id): RETURNS TABLE columns
  -- are PL/pgSQL variables and bare "track_id" in subqueries is ambiguous (PostgreSQL).
  return query
  select
    t.id,
    coalesce(dl.cnt, 0)::bigint,
    coalesce(rt.cnt, 0)::bigint,
    rt.avg_score,
    coalesce(fb.cnt, 0)::bigint,
    coalesce(pr_agg.rows_cnt, 0)::bigint,
    coalesce(pr_agg.play_sum, 0)::bigint,
    coalesce(dfeat.cnt, 0)::bigint
  from public.tracks t
  left join (
    select d.track_id, count(*)::bigint as cnt
    from public.downloads d
    group by d.track_id
  ) dl on dl.track_id = t.id
  left join (
    select
      r.track_id,
      count(*)::bigint as cnt,
      round(avg(r.score)::numeric, 2) as avg_score
    from public.ratings r
    group by r.track_id
  ) rt on rt.track_id = t.id
  left join (
    select f.track_id, count(*)::bigint as cnt
    from public.feedback f
    group by f.track_id
  ) fb on fb.track_id = t.id
  left join (
    select
      pre.track_id,
      count(*)::bigint as rows_cnt,
      coalesce(sum(pre.play_count), 0)::bigint as play_sum
    from public.play_reports pre
    group by pre.track_id
  ) pr_agg on pr_agg.track_id = t.id
  left join (
    select dl_inner.track_id, count(*)::bigint as cnt
    from public.downloads dl_inner
    where exists (
      select 1
      from public.featured_placements fp
      where fp.track_id = dl_inner.track_id
        and fp.moderation_status = 'approved'::public.approval_status
        and (fp.starts_at is null or dl_inner.created_at >= fp.starts_at)
        and (fp.ends_at is null or dl_inner.created_at <= fp.ends_at)
    )
    group by dl_inner.track_id
  ) dfeat on dfeat.track_id = t.id;
end;
$$;

comment on function public.admin_tracks_engagement_rollups() is
  'Admin-only: engagement metrics per track for catalog overview.';

grant execute on function public.admin_tracks_engagement_rollups() to authenticated;

commit;
