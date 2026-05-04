-- Fix: date_trunc is pg_catalog built-in; public.date_trunc(...) errors at runtime.
begin;

create or replace function public.artist_download_timeline(p_days int default 90)
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

commit;
