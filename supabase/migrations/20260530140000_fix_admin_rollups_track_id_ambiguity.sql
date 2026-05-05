-- Fix: RETURNS TABLE(track_id, ...) exposes output names as PL/pgSQL variables; bare
-- track_id in GROUP BY inside admin_tracks_engagement_rollups was ambiguous.

begin;

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

commit;
