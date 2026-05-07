-- Label representatives: manage roster artists without DJ/artist dashboards; uploads stay admin-moderated.

begin;

-- Enum value `label_rep` is added in 20260506180500_user_role_add_label_rep_enum.sql (separate migration).

-- ---------------------------------------------------------------------------
-- label_reps registry (one row per label_rep profile; sync trigger inserts)
-- ---------------------------------------------------------------------------

create table if not exists public.label_reps (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

comment on table public.label_reps is 'Profiles with role label_rep; required before managed roster artists reference managed_by_label_rep_id.';

alter table public.label_reps enable row level security;

drop policy if exists "label_reps_select_own_or_admin" on public.label_reps;
create policy "label_reps_select_own_or_admin"
  on public.label_reps for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "label_reps_update_own_or_admin" on public.label_reps;
create policy "label_reps_update_own_or_admin"
  on public.label_reps for update
  to authenticated
  using (profile_id = auth.uid() or public.is_admin(auth.uid()))
  with check (profile_id = auth.uid() or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Artists: optional login profile (indie) or label-managed roster only
-- ---------------------------------------------------------------------------

alter table public.artists alter column profile_id drop not null;

alter table public.artists drop constraint if exists artists_profile_id_key;

create unique index if not exists artists_profile_id_uidx
  on public.artists (profile_id)
  where profile_id is not null;

alter table public.artists
  add column if not exists managed_by_label_rep_id uuid references public.label_reps (profile_id) on delete set null;

alter table public.tracks
  add column if not exists label_roster_release boolean not null default false;

comment on column public.tracks.label_roster_release is 'When true, DJs see this promo as a label roster / featured-artist release vs indie uploads.';

alter table public.artists drop constraint if exists artists_has_owner_ck;

alter table public.artists
  add constraint artists_has_owner_ck check (
    profile_id is not null
    or managed_by_label_rep_id is not null
  );

-- ---------------------------------------------------------------------------
-- Sync label_rep extension row when profile role is label_rep
-- ---------------------------------------------------------------------------

create or replace function public.sync_profile_role_extensions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'artist' then
      insert into public.artists (profile_id, display_name, status)
      select new.id, coalesce(nullif(trim(new.full_name), ''), 'Artist'), 'active'::public.lifecycle_status
      where not exists (select 1 from public.artists a where a.profile_id = new.id);
    elsif new.role = 'dj' then
      insert into public.djs (profile_id, display_name, status)
      select new.id, coalesce(nullif(trim(new.full_name), ''), 'DJ'), 'active'::public.lifecycle_status
      where not exists (select 1 from public.djs d where d.profile_id = new.id);
    elsif new.role = 'label_rep' then
      insert into public.label_reps (profile_id, display_name)
      select new.id, coalesce(nullif(trim(new.full_name), ''), 'Label')
      where not exists (select 1 from public.label_reps lr where lr.profile_id = new.id);
    end if;
  elsif tg_op = 'UPDATE' and old.role is distinct from new.role then
    if new.role = 'artist' then
      insert into public.artists (profile_id, display_name, status)
      select new.id, coalesce(nullif(trim(new.full_name), ''), 'Artist'), 'active'::public.lifecycle_status
      where not exists (select 1 from public.artists a where a.profile_id = new.id);
    end if;
    if new.role = 'dj' then
      insert into public.djs (profile_id, display_name, status)
      select new.id, coalesce(nullif(trim(new.full_name), ''), 'DJ'), 'active'::public.lifecycle_status
      where not exists (select 1 from public.djs d where d.profile_id = new.id);
    end if;
    if new.role = 'label_rep' then
      insert into public.label_reps (profile_id, display_name)
      select new.id, coalesce(nullif(trim(new.full_name), ''), 'Label')
      where not exists (select 1 from public.label_reps lr where lr.profile_id = new.id);
    end if;
  end if;
  return new;
end;
$$;

insert into public.label_reps (profile_id, display_name)
select p.id, coalesce(nullif(trim(p.full_name), ''), 'Label')
from public.profiles p
where p.role = 'label_rep'
  and not exists (select 1 from public.label_reps lr where lr.profile_id = p.id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.label_rep_manages_track(p_track_id uuid)
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
      and ar.managed_by_label_rep_id = auth.uid()
  );
$$;

create or replace function public.label_rep_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'label_rep'::public.user_role
  );
$$;

grant execute on function public.label_rep_manages_track(uuid) to authenticated;
grant execute on function public.label_rep_profile() to authenticated;

-- Resubmit rejected packs: allow label reps managing the track (parity with artist_owns_track).
create or replace function public.tracks_enforce_moderation_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_admin(auth.uid()) then
      new.moderation_status := 'pending'::public.approval_status;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.moderation_status is distinct from new.moderation_status then
      if public.is_admin(auth.uid()) then
        return new;
      end if;
      if
        old.moderation_status = 'rejected'::public.approval_status
        and new.moderation_status = 'pending'::public.approval_status
        and (
          public.artist_owns_track(old.id, auth.uid())
          or public.label_rep_manages_track(old.id)
        )
      then
        return new;
      end if;
      raise exception 'Only admins can approve or reject tracks'
        using errcode = '42501';
    end if;
    return new;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.label_rep_create_managed_artist(p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'label_rep'::public.user_role
  ) then
    raise exception 'Not a label rep' using errcode = '42501';
  end if;
  if not exists (select 1 from public.label_reps lr where lr.profile_id = auth.uid()) then
    raise exception 'Label rep profile not initialized' using errcode = 'P0001';
  end if;

  insert into public.artists (profile_id, display_name, managed_by_label_rep_id, status)
  values (
    null,
    coalesce(nullif(trim(p_display_name), ''), 'Artist'),
    auth.uid(),
    'active'::public.lifecycle_status
  )
  returning id into aid;

  return aid;
end;
$$;

revoke all on function public.label_rep_create_managed_artist(text) from public;
grant execute on function public.label_rep_create_managed_artist(text) to authenticated;

create or replace function public.create_label_managed_draft_track(p_artist_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.artists a
    where a.id = p_artist_id
      and a.managed_by_label_rep_id = auth.uid()
  ) then
    raise exception 'Artist not on your roster' using errcode = '42501';
  end if;

  insert into public.tracks (
    artist_id,
    title,
    is_draft,
    moderation_status,
    label_roster_release
  )
  values (
    p_artist_id,
    'Untitled draft',
    true,
    'pending'::public.approval_status,
    true
  )
  returning id into tid;

  return tid;
end;
$$;

revoke all on function public.create_label_managed_draft_track(uuid) from public;
grant execute on function public.create_label_managed_draft_track(uuid) to authenticated;

comment on function public.label_rep_create_managed_artist(text) is
  'Label rep: inserts roster artists row without its own login (managed_by_label_rep_id = auth.uid()).';

comment on function public.create_label_managed_draft_track(uuid) is
  'Label rep: draft DJ pack for a managed-artist row; sets label_roster_release true.';

-- ---------------------------------------------------------------------------
-- tracks policies
-- ---------------------------------------------------------------------------

drop policy if exists "tracks_select_scope" on public.tracks;
create policy "tracks_select_scope"
  on public.tracks for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(id, auth.uid())
    or public.track_is_visible_to_dj(id)
    or public.label_rep_manages_track(id)
    or public.label_rep_profile()
  );

drop policy if exists "tracks_insert_owner_artist" on public.tracks;
create policy "tracks_insert_owner_artist"
  on public.tracks for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.profile_id = auth.uid()
    )
  );

drop policy if exists "tracks_insert_label_rep_managed" on public.tracks;
create policy "tracks_insert_label_rep_managed"
  on public.tracks for insert
  to authenticated
  with check (
    public.label_rep_profile()
    and exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.managed_by_label_rep_id = auth.uid()
    )
  );

drop policy if exists "tracks_update_owner_or_admin" on public.tracks;
create policy "tracks_update_owner_or_admin"
  on public.tracks for update
  to authenticated
  using (
    public.artist_owns_track(id, auth.uid())
    or public.is_admin(auth.uid())
    or public.label_rep_manages_track(id)
  )
  with check (
    public.artist_owns_track(id, auth.uid())
    or public.is_admin(auth.uid())
    or public.label_rep_manages_track(id)
  );

drop policy if exists "tracks_delete_owner_or_admin" on public.tracks;
create policy "tracks_delete_owner_or_admin"
  on public.tracks for delete
  to authenticated
  using (
    public.artist_owns_track(id, auth.uid())
    or public.is_admin(auth.uid())
    or public.label_rep_manages_track(id)
  );

-- ---------------------------------------------------------------------------
-- artists policies
-- ---------------------------------------------------------------------------

drop policy if exists "artists_insert_label_rep_managed" on public.artists;
create policy "artists_insert_label_rep_managed"
  on public.artists for insert
  to authenticated
  with check (
    public.label_rep_profile()
    and managed_by_label_rep_id = auth.uid()
    and profile_id is null
  );

drop policy if exists "artists_update_own_or_admin" on public.artists;
create policy "artists_update_own_or_admin"
  on public.artists for update
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin(auth.uid())
    or managed_by_label_rep_id = auth.uid()
  )
  with check (
    profile_id = auth.uid()
    or public.is_admin(auth.uid())
    or managed_by_label_rep_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- track_files policies
-- ---------------------------------------------------------------------------

drop policy if exists "track_files_select_scope" on public.track_files;
create policy "track_files_select_scope"
  on public.track_files for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or public.track_is_visible_to_dj(track_id)
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  );

drop policy if exists "track_files_write_owner_artist_or_admin" on public.track_files;
create policy "track_files_write_owner_artist_or_admin"
  on public.track_files for insert
  to authenticated
  with check (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
  );

drop policy if exists "track_files_update_owner_or_admin" on public.track_files;
create policy "track_files_update_owner_or_admin"
  on public.track_files for update
  to authenticated
  using (
    public.artist_owns_track(track_id, auth.uid())
    or public.is_admin(auth.uid())
    or public.label_rep_manages_track(track_id)
  )
  with check (
    public.artist_owns_track(track_id, auth.uid())
    or public.is_admin(auth.uid())
    or public.label_rep_manages_track(track_id)
  );

drop policy if exists "track_files_delete_owner_or_admin" on public.track_files;
create policy "track_files_delete_owner_or_admin"
  on public.track_files for delete
  to authenticated
  using (
    public.artist_owns_track(track_id, auth.uid())
    or public.is_admin(auth.uid())
    or public.label_rep_manages_track(track_id)
  );

-- ---------------------------------------------------------------------------
-- downloads
-- ---------------------------------------------------------------------------

drop policy if exists "downloads_select_scope" on public.downloads;
create policy "downloads_select_scope"
  on public.downloads for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  );

drop policy if exists "downloads_update_scope" on public.downloads;
create policy "downloads_update_scope"
  on public.downloads for update
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  )
  with check (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  );

-- ---------------------------------------------------------------------------
-- ratings / feedback / featured_placements / play_reports / admin_reviews
-- ---------------------------------------------------------------------------

drop policy if exists "ratings_select_scope" on public.ratings;
create policy "ratings_select_scope"
  on public.ratings for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
    or dj_id = public.current_dj_id()
    or public.track_is_visible_to_dj(track_id)
  );

drop policy if exists "feedback_select_scope" on public.feedback;
create policy "feedback_select_scope"
  on public.feedback for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
    or dj_id = public.current_dj_id()
    or (
      public.track_is_visible_to_dj(track_id)
      and moderation_status = 'approved'::public.approval_status
    )
  );

drop policy if exists "feedback_update_scope" on public.feedback;
create policy "feedback_update_scope"
  on public.feedback for update
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  )
  with check (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  );

drop policy if exists "featured_placements_select_scope" on public.featured_placements;
create policy "featured_placements_select_scope"
  on public.featured_placements for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
    or (
      public.track_is_visible_to_dj(track_id)
      and moderation_status = 'approved'::public.approval_status
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
  );

drop policy if exists "play_reports_select_scope" on public.play_reports;
create policy "play_reports_select_scope"
  on public.play_reports for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  );

drop policy if exists "play_reports_update_scope" on public.play_reports;
create policy "play_reports_update_scope"
  on public.play_reports for update
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  )
  with check (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  );

drop policy if exists "admin_reviews_select_scope" on public.admin_reviews;
create policy "admin_reviews_select_scope"
  on public.admin_reviews for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or public.label_rep_manages_track(track_id)
    or public.label_rep_profile()
  );

-- ---------------------------------------------------------------------------
-- DJ catalog feed: expose label_roster_release for UI badges
-- ---------------------------------------------------------------------------

drop function if exists public.dj_catalog_feed(text, text, numeric, numeric, text, text, uuid[], int, int);

create function public.dj_catalog_feed(
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
  rating_count bigint,
  label_roster_release boolean
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
      t.label_roster_release,
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
    b.rating_count,
    b.label_roster_release
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
  'DJ/admin: catalog-visible tracks with aggregate stats for discovery sorting; includes label_roster_release for roster badges.';

grant execute on function public.dj_catalog_feed(
  text, text, numeric, numeric, text, text, uuid[], int, int
) to authenticated;

commit;
