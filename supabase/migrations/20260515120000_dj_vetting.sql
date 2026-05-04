-- DJ vetting: applications, tiers, promo-pool access (approved only).

begin;

-- ---------------------------------------------------------------------------
-- Enums + djs columns
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.dj_vetting_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.dj_tier as enum (
    'verified',
    'club_dj',
    'radio_dj',
    'influencer_dj',
    'curator'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.djs
  add column if not exists vetting_status public.dj_vetting_status not null default 'pending';

alter table public.djs
  add column if not exists dj_tier public.dj_tier;

alter table public.djs
  add column if not exists state text;

comment on column public.djs.vetting_status is 'Promo pool access requires approved; suspended blocks all promo actions.';
comment on column public.djs.dj_tier is 'Assigned by admin when approved; exposed to artists as DJ type.';
comment on column public.djs.state is 'Region/state for analytics (optional); may mirror application.';

-- Existing DJs at migration time: grant approved so current users retain promo access.
update public.djs set vetting_status = 'approved';

-- ---------------------------------------------------------------------------
-- Application snapshot (one row per DJ; resubmit = upsert)
-- ---------------------------------------------------------------------------

create table if not exists public.dj_applications (
  id uuid primary key default gen_random_uuid(),
  dj_id uuid not null references public.djs (id) on delete cascade,
  dj_name text not null,
  city text not null,
  state text not null,
  email text not null,
  phone text not null,
  instagram text,
  mixcloud_soundcloud_url text,
  club_radio_affiliation text,
  years_djing integer not null default 0,
  primary_genres text not null,
  avg_crowd_size text not null,
  plays_clubs boolean not null default false,
  plays_radio boolean not null default false,
  breaks_new_records boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dj_applications_dj_id_key unique (dj_id),
  constraint dj_applications_years_non_negative check (years_djing >= 0)
);

comment on table public.dj_applications is 'DJ promo-pool application; private fields admin-only + owning DJ.';

drop trigger if exists dj_applications_updated_at on public.dj_applications;
create trigger dj_applications_updated_at
  before update on public.dj_applications
  for each row execute function public.handle_updated_at();

create index if not exists dj_applications_dj_id_idx on public.dj_applications (dj_id);

-- ---------------------------------------------------------------------------
-- Access helper (RLS + RPC)
-- ---------------------------------------------------------------------------

create or replace function public.current_dj_vetting_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select d.vetting_status = 'approved'::public.dj_vetting_status
      from public.djs d
      where d.profile_id = auth.uid()
      limit 1
    ),
    false
  );
$$;

comment on function public.current_dj_vetting_approved() is 'True when session profile owns a DJ row with vetting approved.';

grant execute on function public.current_dj_vetting_approved() to authenticated;

-- ---------------------------------------------------------------------------
-- dj_catalog_feed: require approved DJ (admins bypass via existing branch)
-- ---------------------------------------------------------------------------

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
  if public.current_dj_id() is not null
     and not public.current_dj_vetting_approved()
     and not public.is_admin(auth.uid()) then
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

-- ---------------------------------------------------------------------------
-- Artist analytics: tier + location (not private contact)
-- ---------------------------------------------------------------------------
-- Return type changed — must drop; CREATE OR REPLACE cannot change OUT params.

drop function if exists public.artist_most_active_djs(integer);

create or replace function public.artist_most_active_djs(p_limit int default 10)
returns table (
  dj_id uuid,
  dj_label text,
  download_count bigint,
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
    count(dl.id)::bigint,
    d.dj_tier,
    d.city,
    d.state
  from public.downloads dl
  inner join public.tracks t on t.id = dl.track_id
  inner join public.djs d on d.id = dl.dj_id
  where t.artist_id = aid
  group by d.id, d.display_name, d.allow_artist_contact, d.dj_tier, d.city, d.state
  order by count(dl.id) desc
  limit lim;
end;
$$;

drop function if exists public.artist_track_supporters(uuid, integer);

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

grant execute on function public.artist_most_active_djs(integer) to authenticated;
grant execute on function public.artist_track_supporters(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: dj_applications
-- ---------------------------------------------------------------------------

alter table public.dj_applications enable row level security;

drop policy if exists "dj_applications_select_own_or_admin" on public.dj_applications;
drop policy if exists "dj_applications_insert_own" on public.dj_applications;
drop policy if exists "dj_applications_update_own" on public.dj_applications;
drop policy if exists "dj_applications_admin_all" on public.dj_applications;

create policy "dj_applications_select_own_or_admin"
  on public.dj_applications for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
  );

create policy "dj_applications_insert_own"
  on public.dj_applications for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.current_dj_id() is not null
    and exists (
      select 1
      from public.djs d
      where d.id = dj_id
        and d.vetting_status <> 'suspended'::public.dj_vetting_status
    )
  );

create policy "dj_applications_update_own"
  on public.dj_applications for update
  to authenticated
  using (
    dj_id = public.current_dj_id()
    and exists (
      select 1
      from public.djs d
      where d.id = dj_id
        and d.vetting_status <> 'suspended'::public.dj_vetting_status
    )
  )
  with check (
    dj_id = public.current_dj_id()
    and exists (
      select 1
      from public.djs d
      where d.id = dj_id
        and d.vetting_status <> 'suspended'::public.dj_vetting_status
    )
  );

create policy "dj_applications_admin_all"
  on public.dj_applications for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS: tighten promo actions + catalog file reads for unvetted DJs
-- ---------------------------------------------------------------------------

drop policy if exists "track_files_select_scope" on public.track_files;

create policy "track_files_select_scope"
  on public.track_files for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or (
      public.track_is_visible_to_dj(track_id)
      and public.current_dj_id() is not null
      and public.current_dj_vetting_approved()
    )
  );

drop policy if exists "promos_select_dj_visible_track_file" on storage.objects;

create policy "promos_select_dj_visible_track_file"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'promos'
    and public.current_dj_id() is not null
    and public.current_dj_vetting_approved()
    and exists (
      select 1
      from public.track_files tf
      join public.tracks tr on tr.id = tf.track_id
      where tf.storage_path = name
        and public.track_is_visible_to_dj(tr.id)
    )
  );

drop policy if exists "downloads_insert_dj_approved_track" on public.downloads;

create policy "downloads_insert_dj_approved_track"
  on public.downloads for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.track_is_visible_to_dj(track_id)
    and public.current_dj_vetting_approved()
  );

drop policy if exists "ratings_insert_dj" on public.ratings;

create policy "ratings_insert_dj"
  on public.ratings for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.track_is_visible_to_dj(track_id)
    and public.current_dj_vetting_approved()
  );

drop policy if exists "feedback_insert_dj" on public.feedback;

create policy "feedback_insert_dj"
  on public.feedback for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.track_is_visible_to_dj(track_id)
    and public.current_dj_vetting_approved()
  );

drop policy if exists "play_reports_insert_dj" on public.play_reports;

create policy "play_reports_insert_dj"
  on public.play_reports for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.track_is_visible_to_dj(track_id)
    and public.current_dj_vetting_approved()
  );

-- Admin may update vetting / tier on djs (already had update policy)
-- Ensure admins can set vetting_status and dj_tier — covered by djs_update_own_or_admin? 
-- Admin uses is_admin — existing policy "djs_update_own_or_admin" allows admin.

commit;
