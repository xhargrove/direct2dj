-- Editorial spotlights + public leaderboard/hub RPCs for homepage, /featured, and DJ Discover.

begin;

create type public.editorial_spotlight_slot as enum ('record_of_week', 'dj_pick');

create table public.editorial_spotlights (
  id uuid primary key default gen_random_uuid(),
  slot_type public.editorial_spotlight_slot not null,
  track_id uuid not null references public.tracks (id) on delete cascade,
  headline text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_spotlights_headline_len check (headline is null or length(trim(headline)) <= 200)
);

create index editorial_spotlights_slot_active_idx
  on public.editorial_spotlights (slot_type, starts_at desc);

create trigger editorial_spotlights_updated_at
  before update on public.editorial_spotlights
  for each row execute function public.handle_updated_at();

comment on table public.editorial_spotlights is
  'Admin-curated spotlight slots (Record of the Week, DSP DJ Pick).';

alter table public.editorial_spotlights enable row level security;

create policy "editorial_spotlights_admin_all"
  on public.editorial_spotlights for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Shared track row shape for spotlight cards (security definer reads).
create or replace function public.spotlight_track_card(p_track_id uuid)
returns table (
  track_id uuid,
  title text,
  credit_artist_name text,
  genre text,
  bpm numeric,
  explicit_rating text,
  artist_display_name text,
  cover_storage_path text,
  youtube_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tr.id as track_id,
    tr.title,
    tr.credit_artist_name,
    tr.genre,
    tr.bpm,
    tr.explicit_rating::text,
    ar.display_name as artist_display_name,
    cov.storage_path as cover_storage_path,
    tr.youtube_url
  from public.tracks tr
  join public.artists ar on ar.id = tr.artist_id
  left join lateral (
    select tf.storage_path
    from public.track_files tf
    where tf.track_id = tr.id
      and tf.pack_slot = 'cover_art'::public.pack_slot
    order by tf.created_at asc
    limit 1
  ) cov on true
  where tr.id = p_track_id
    and public.track_is_visible_to_dj(p_track_id);
$$;

create or replace function public.public_spotlight_editorial(p_slot public.editorial_spotlight_slot)
returns table (
  section text,
  editorial_id uuid,
  headline text,
  track_id uuid,
  title text,
  credit_artist_name text,
  genre text,
  bpm numeric,
  explicit_rating text,
  artist_display_name text,
  cover_storage_path text,
  youtube_url text,
  metric_value bigint,
  metric_label text,
  placement_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select es.*
    from public.editorial_spotlights es
    where es.slot_type = p_slot
      and es.starts_at <= now()
      and (es.ends_at is null or es.ends_at > now())
      and public.track_is_visible_to_dj(es.track_id)
    order by es.starts_at desc
    limit 1
  )
  select
    p_slot::text as section,
    a.id as editorial_id,
    a.headline,
    c.track_id,
    c.title,
    c.credit_artist_name,
    c.genre,
    c.bpm,
    c.explicit_rating,
    c.artist_display_name,
    c.cover_storage_path,
    c.youtube_url,
    null::bigint as metric_value,
    null::text as metric_label,
    null::uuid as placement_id
  from active a
  join lateral public.spotlight_track_card(a.track_id) c on true;
$$;

create or replace function public.public_spotlight_sponsored(p_limit integer default 8)
returns table (
  section text,
  editorial_id uuid,
  headline text,
  track_id uuid,
  title text,
  credit_artist_name text,
  genre text,
  bpm numeric,
  explicit_rating text,
  artist_display_name text,
  cover_storage_path text,
  youtube_url text,
  metric_value bigint,
  metric_label text,
  placement_id uuid
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
    'sponsored'::text as section,
    null::uuid as editorial_id,
    p.placement_label as headline,
    c.track_id,
    c.title,
    c.credit_artist_name,
    c.genre,
    c.bpm,
    c.explicit_rating,
    c.artist_display_name,
    c.cover_storage_path,
    c.youtube_url,
    null::bigint as metric_value,
    'Paid placement'::text as metric_label,
    p.placement_id
  from picked p
  join lateral public.spotlight_track_card(p.track_id) c on true
  order by p.placement_id desc
  limit least(greatest(coalesce(p_limit, 8), 1), 24);
$$;

create or replace function public.public_spotlight_leaderboard(
  p_kind text,
  p_limit integer default 8,
  p_days integer default 30
)
returns table (
  section text,
  editorial_id uuid,
  headline text,
  track_id uuid,
  title text,
  credit_artist_name text,
  genre text,
  bpm numeric,
  explicit_rating text,
  artist_display_name text,
  cover_storage_path text,
  youtube_url text,
  metric_value bigint,
  metric_label text,
  placement_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      least(greatest(coalesce(p_limit, 8), 1), 24) as lim,
      greatest(coalesce(p_days, 30), 1) as days_window,
      now() - (greatest(coalesce(p_days, 30), 1) || ' days')::interval as since_ts
  ),
  eligible as (
    select tr.id as track_id
    from public.tracks tr
    where public.track_is_visible_to_dj(tr.id)
  ),
  dl as (
    select d.track_id, count(*)::bigint as cnt
    from public.downloads d
    cross join params p
    where d.track_id in (select track_id from eligible)
      and d.created_at >= p.since_ts
    group by d.track_id
  ),
  fb as (
    select f.track_id, count(*)::bigint as cnt
    from public.feedback f
    cross join params p
    where f.track_id in (select track_id from eligible)
      and f.created_at >= p.since_ts
    group by f.track_id
  ),
  rt as (
    select r.track_id, count(*)::bigint as cnt
    from public.ratings r
    cross join params p
    where r.track_id in (select track_id from eligible)
      and r.created_at >= p.since_ts
    group by r.track_id
  ),
  pl as (
    select pr.track_id, coalesce(sum(pr.play_count), 0)::bigint as cnt
    from public.play_reports pr
    cross join params p
    where pr.track_id in (select track_id from eligible)
      and pr.created_at >= p.since_ts
    group by pr.track_id
  ),
  scored as (
    select
      e.track_id,
      case p_kind
        when 'trending' then
          coalesce(dl.cnt, 0) * 3
          + coalesce(rt.cnt, 0) * 2
          + coalesce(fb.cnt, 0) * 2
          + coalesce(pl.cnt, 0)
        when 'most_downloaded' then coalesce(dl.cnt, 0)
        when 'most_feedback' then coalesce(fb.cnt, 0)
        else 0
      end as score,
      coalesce(dl.cnt, 0) as dl_cnt,
      coalesce(fb.cnt, 0) as fb_cnt
    from eligible e
    cross join params prm
    left join dl on dl.track_id = e.track_id
    left join fb on fb.track_id = e.track_id
    left join rt on rt.track_id = e.track_id
    left join pl on pl.track_id = e.track_id
    where case p_kind
      when 'trending' then
        (coalesce(dl.cnt, 0) + coalesce(rt.cnt, 0) + coalesce(fb.cnt, 0) + coalesce(pl.cnt, 0)) > 0
      when 'most_downloaded' then coalesce(dl.cnt, 0) >= 1
      when 'most_feedback' then coalesce(fb.cnt, 0) >= 1
      else false
    end
  ),
  ranked as (
    select s.*, row_number() over (order by s.score desc, s.track_id) as rn
    from scored s
  )
  select
    p_kind as section,
    null::uuid as editorial_id,
    null::text as headline,
    c.track_id,
    c.title,
    c.credit_artist_name,
    c.genre,
    c.bpm,
    c.explicit_rating,
    c.artist_display_name,
    c.cover_storage_path,
    c.youtube_url,
    r.score as metric_value,
    case p_kind
      when 'trending' then r.score::text || ' pts · ' || prm.days_window::text || ' days'
      when 'most_downloaded' then r.dl_cnt::text || ' downloads · ' || prm.days_window::text || ' days'
      when 'most_feedback' then r.fb_cnt::text || ' feedback · ' || prm.days_window::text || ' days'
      else null
    end as metric_label,
    null::uuid as placement_id
  from ranked r
  cross join params prm
  join lateral public.spotlight_track_card(r.track_id) c on true
  where r.rn <= prm.lim
  order by r.rn;
$$;

create or replace function public.public_spotlight_hub(p_limit_per_section integer default 8)
returns table (
  section text,
  editorial_id uuid,
  headline text,
  track_id uuid,
  title text,
  credit_artist_name text,
  genre text,
  bpm numeric,
  explicit_rating text,
  artist_display_name text,
  cover_storage_path text,
  youtube_url text,
  metric_value bigint,
  metric_label text,
  placement_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.public_spotlight_editorial('record_of_week'::public.editorial_spotlight_slot)
  union all
  select * from public.public_spotlight_editorial('dj_pick'::public.editorial_spotlight_slot)
  union all
  select * from public.public_spotlight_sponsored(p_limit_per_section)
  union all
  select * from public.public_spotlight_leaderboard('trending', p_limit_per_section, 7)
  union all
  select * from public.public_spotlight_leaderboard('most_downloaded', p_limit_per_section, 30)
  union all
  select * from public.public_spotlight_leaderboard('most_feedback', p_limit_per_section, 30);
$$;

comment on function public.public_spotlight_hub(integer) is
  'All spotlight sections for marketing homepage and /featured (dedupe in app layer).';

revoke all on function public.spotlight_track_card(uuid) from public;
revoke all on function public.public_spotlight_editorial(public.editorial_spotlight_slot) from public;
revoke all on function public.public_spotlight_sponsored(integer) from public;
revoke all on function public.public_spotlight_leaderboard(text, integer, integer) from public;
revoke all on function public.public_spotlight_hub(integer) from public;

grant execute on function public.spotlight_track_card(uuid) to authenticated;
grant execute on function public.public_spotlight_editorial(public.editorial_spotlight_slot) to anon, authenticated;
grant execute on function public.public_spotlight_sponsored(integer) to anon, authenticated;
grant execute on function public.public_spotlight_leaderboard(text, integer, integer) to anon, authenticated;
grant execute on function public.public_spotlight_hub(integer) to anon, authenticated;

commit;
