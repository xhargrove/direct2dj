-- Admin-only RPCs: merged DJ promo activity with stable pagination (union + order + limit/offset).

begin;

create or replace function public.admin_dj_activity_feed(
  p_dj_id uuid,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  activity_at timestamptz,
  kind text,
  detail text,
  track_id uuid,
  track_title text,
  dj_id uuid,
  dj_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := coalesce(nullif(p_limit, 0), 50);
  off int := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    return;
  end if;

  if lim < 1 then
    lim := 50;
  elsif lim > 200 then
    lim := 200;
  end if;

  return query
  select *
  from (
    select
      d.created_at as activity_at,
      'Download'::text as kind,
      'Pack download'::text as detail,
      t.id as track_id,
      t.title::text as track_title,
      dj.id as dj_id,
      dj.display_name::text as dj_name
    from public.downloads d
    join public.tracks t on t.id = d.track_id
    join public.djs dj on dj.id = d.dj_id
    where (p_dj_id is null or d.dj_id = p_dj_id)

    union all

    select
      pr.created_at,
      'Play report'::text,
      ('Plays +' || pr.play_count::text)::text,
      t.id,
      t.title::text,
      dj.id,
      dj.display_name::text
    from public.play_reports pr
    join public.tracks t on t.id = pr.track_id
    join public.djs dj on dj.id = pr.dj_id
    where (p_dj_id is null or pr.dj_id = p_dj_id)

    union all

    select
      r.created_at,
      'Rating'::text,
      (r.score::text || '/5')::text,
      t.id,
      t.title::text,
      dj.id,
      dj.display_name::text
    from public.ratings r
    join public.tracks t on t.id = r.track_id
    join public.djs dj on dj.id = r.dj_id
    where (p_dj_id is null or r.dj_id = p_dj_id)

    union all

    select
      f.created_at,
      'Feedback'::text,
      case
        when length(trim(f.body)) <= 140 then trim(f.body)
        else left(trim(f.body), 140) || '…'
      end::text,
      t.id,
      t.title::text,
      dj.id,
      dj.display_name::text
    from public.feedback f
    join public.tracks t on t.id = f.track_id
    join public.djs dj on dj.id = f.dj_id
    where (p_dj_id is null or f.dj_id = p_dj_id)
  ) u
  order by activity_at desc
  limit lim
  offset off;
end;
$$;

create or replace function public.admin_dj_activity_feed_total(p_dj_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    return 0;
  end if;

  select count(*)::bigint into n
  from (
    select d.id from public.downloads d where (p_dj_id is null or d.dj_id = p_dj_id)
    union all
    select pr.id from public.play_reports pr where (p_dj_id is null or pr.dj_id = p_dj_id)
    union all
    select r.id from public.ratings r where (p_dj_id is null or r.dj_id = p_dj_id)
    union all
    select f.id from public.feedback f where (p_dj_id is null or f.dj_id = p_dj_id)
  ) x;

  return coalesce(n, 0);
end;
$$;

grant execute on function public.admin_dj_activity_feed(uuid, int, int) to authenticated;
grant execute on function public.admin_dj_activity_feed_total(uuid) to authenticated;

comment on function public.admin_dj_activity_feed(uuid, int, int) is
  'Admin-only: merged downloads, play reports, ratings, feedback; newest first. Null dj id = all DJs.';

comment on function public.admin_dj_activity_feed_total(uuid) is
  'Admin-only: total activity rows for pagination (same filter as admin_dj_activity_feed).';

commit;
