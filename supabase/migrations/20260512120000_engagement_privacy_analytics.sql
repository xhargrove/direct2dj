-- Expanded ratings, download package manifest, DJ privacy flag for artists,
-- tightened SELECT policies (artists use RPCs only for engagement rows),
-- artist analytics SECURITY DEFINER functions.

begin;

-- Idempotent: type may already exist if applied manually or from a prior partial run.
do $$ begin
  create type public.crowd_reaction as enum ('cold', 'warm', 'strong', 'hit_potential');
exception
  when duplicate_object then null;
end $$;

alter table public.downloads
  add column if not exists package_manifest jsonb not null default '[]'::jsonb;

comment on column public.downloads.package_manifest is
  'Snapshot of track_files included when the DJ downloaded the pack (ids + slots + paths).';

alter table public.ratings
  add column if not exists club_ready boolean,
  add column if not exists radio_ready boolean,
  add column if not exists rating_comment text,
  add column if not exists crowd_reaction public.crowd_reaction;

comment on column public.ratings.club_ready is 'Optional DJ signal';
comment on column public.ratings.radio_ready is 'Optional DJ signal';
comment on column public.ratings.rating_comment is 'Optional notes tied to this rating row (separate from feedback table)';
comment on column public.ratings.crowd_reaction is 'Optional crowd reaction';

alter table public.djs
  add column if not exists allow_artist_contact boolean not null default false;

comment on column public.djs.allow_artist_contact is
  'When true, artists see this DJ''s display name on ratings/feedback analytics; otherwise anonymized label only.';

-- ---------------------------------------------------------------------------
-- RLS: artists read engagement via RPCs only (privacy).
-- ---------------------------------------------------------------------------

drop policy if exists "ratings_select_scope" on public.ratings;

create policy "ratings_select_scope"
  on public.ratings for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.track_is_visible_to_dj(track_id)
  );

drop policy if exists "downloads_select_scope" on public.downloads;

create policy "downloads_select_scope"
  on public.downloads for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
  );

drop policy if exists "feedback_select_scope" on public.feedback;

create policy "feedback_select_scope"
  on public.feedback for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or (
      public.track_is_visible_to_dj(track_id)
      and moderation_status = 'approved'::public.approval_status
    )
  );

-- ---------------------------------------------------------------------------
-- Artist analytics (session artist only).
-- ---------------------------------------------------------------------------

-- Remote may have older return row types; CREATE OR REPLACE cannot change OUT params.
drop function if exists public.artist_analytics_summary();
drop function if exists public.artist_most_active_djs(integer);
drop function if exists public.artist_feedback_dashboard(integer);

create or replace function public.artist_analytics_summary()
returns table (
  total_downloads bigint,
  total_ratings bigint,
  avg_rating numeric,
  club_ready_pct numeric,
  radio_ready_pct numeric
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
    (select count(*)::bigint from public.downloads dl inner join public.tracks t on t.id = dl.track_id where t.artist_id = aid),
    (select count(*)::bigint from public.ratings r inner join public.tracks t on t.id = r.track_id where t.artist_id = aid),
    (select round(avg(r.score)::numeric, 2) from public.ratings r inner join public.tracks t on t.id = r.track_id where t.artist_id = aid),
    (
      select case
        when count(*) filter (where r.club_ready is not null) = 0 then null::numeric
        else round(
          100.0 * count(*) filter (where r.club_ready = true)
          / nullif(count(*) filter (where r.club_ready is not null), 0),
          1
        )
      end
      from public.ratings r
      inner join public.tracks t on t.id = r.track_id
      where t.artist_id = aid
    ),
    (
      select case
        when count(*) filter (where r.radio_ready is not null) = 0 then null::numeric
        else round(
          100.0 * count(*) filter (where r.radio_ready = true)
          / nullif(count(*) filter (where r.radio_ready is not null), 0),
          1
        )
      end
      from public.ratings r
      inner join public.tracks t on t.id = r.track_id
      where t.artist_id = aid
    );
end;
$$;

create or replace function public.artist_most_active_djs(p_limit int default 10)
returns table (
  dj_id uuid,
  dj_label text,
  download_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
  lim int := greatest(1, least(coalesce(p_limit, 10), 50));
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    d.id,
    (case
      when d.allow_artist_contact then d.display_name
      else 'DJ #' || substring(replace(d.id::text, '-', ''), 1, 8)
    end)::text,
    count(dl.id)::bigint
  from public.downloads dl
  inner join public.tracks t on t.id = dl.track_id
  inner join public.djs d on d.id = dl.dj_id
  where t.artist_id = aid
  group by d.id, d.display_name, d.allow_artist_contact
  order by count(dl.id) desc
  limit lim;
end;
$$;

create or replace function public.artist_feedback_dashboard(p_limit int default 50)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  moderation_status public.approval_status,
  track_title text,
  dj_label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
  lim int := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.body,
    f.created_at,
    f.moderation_status,
    t.title,
    (case
      when d.allow_artist_contact then d.display_name
      else 'DJ #' || substring(replace(d.id::text, '-', ''), 1, 8)
    end)::text
  from public.feedback f
  inner join public.tracks t on t.id = f.track_id
  inner join public.djs d on d.id = f.dj_id
  where t.artist_id = aid
  order by f.created_at desc
  limit lim;
end;
$$;

comment on function public.artist_analytics_summary() is
  'Artist-only: aggregate downloads/ratings for all tracks owned by current artist.';
comment on function public.artist_most_active_djs(int) is
  'Artist-only: top DJs by download count; DJ names masked unless allow_artist_contact.';
comment on function public.artist_feedback_dashboard(int) is
  'Artist-only: feedback lines with anonymized DJ labels unless opted in.';

grant execute on function public.artist_analytics_summary() to authenticated;
grant execute on function public.artist_most_active_djs(int) to authenticated;
grant execute on function public.artist_feedback_dashboard(int) to authenticated;

commit;
