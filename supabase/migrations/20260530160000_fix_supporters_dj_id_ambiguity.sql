-- RETURNS TABLE(dj_id, ...) exposes dj_id as a PL/pgSQL variable; bare dj_id in the
-- involved CTE was ambiguous (same pattern as admin rollups track_id fix).

begin;

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
    select distinct dl.dj_id from public.downloads dl where dl.track_id = p_track_id
    union
    select distinct r.dj_id from public.ratings r where r.track_id = p_track_id
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

commit;
