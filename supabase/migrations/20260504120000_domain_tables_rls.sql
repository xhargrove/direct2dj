-- Digital Service Pack — domain tables (artists, tracks, DJs, packs, engagement) + RLS
-- Depends on: 20260503120000_init_direct2dj.sql (profiles, is_admin, handle_updated_at)

begin;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.lifecycle_status as enum ('active', 'inactive');

-- ---------------------------------------------------------------------------
-- Core extension tables
-- ---------------------------------------------------------------------------

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  display_name text not null,
  bio text,
  status public.lifecycle_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.djs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  display_name text not null,
  bio text,
  status public.lifecycle_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null,
  description text,
  moderation_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dj_packs (
  id uuid primary key default gen_random_uuid(),
  dj_id uuid not null references public.djs (id) on delete cascade,
  name text not null,
  description text,
  status public.lifecycle_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.track_file_kind as enum ('audio', 'cover', 'stem', 'other');

create table public.track_files (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  kind public.track_file_kind not null default 'audio',
  storage_path text not null,
  mime_type text,
  byte_size bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  dj_id uuid not null references public.djs (id) on delete cascade,
  status public.lifecycle_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  dj_id uuid not null references public.djs (id) on delete cascade,
  score smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ratings_score_range check (score >= 1 and score <= 5),
  constraint ratings_track_dj_unique unique (track_id, dj_id)
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  dj_id uuid not null references public.djs (id) on delete cascade,
  body text not null,
  moderation_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.featured_placements (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  label text,
  starts_at timestamptz,
  ends_at timestamptz,
  moderation_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.play_reports (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  dj_id uuid not null references public.djs (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  play_count integer not null default 0,
  status public.lifecycle_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint play_reports_period_order check (period_end >= period_start)
);

create table public.admin_reviews (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  decision public.approval_status not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index tracks_artist_id_idx on public.tracks (artist_id);
create index tracks_moderation_status_idx on public.tracks (moderation_status);
create index track_files_track_id_idx on public.track_files (track_id);
create index downloads_track_id_idx on public.downloads (track_id);
create index downloads_dj_id_idx on public.downloads (dj_id);
create index ratings_track_id_idx on public.ratings (track_id);
create index feedback_track_id_idx on public.feedback (track_id);
create index featured_placements_track_id_idx on public.featured_placements (track_id);
create index play_reports_track_id_idx on public.play_reports (track_id);
create index admin_reviews_track_id_idx on public.admin_reviews (track_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse public.handle_updated_at)
-- ---------------------------------------------------------------------------

create trigger artists_updated_at before update on public.artists for each row execute function public.handle_updated_at();
create trigger djs_updated_at before update on public.djs for each row execute function public.handle_updated_at();
create trigger tracks_updated_at before update on public.tracks for each row execute function public.handle_updated_at();
create trigger dj_packs_updated_at before update on public.dj_packs for each row execute function public.handle_updated_at();
create trigger track_files_updated_at before update on public.track_files for each row execute function public.handle_updated_at();
create trigger downloads_updated_at before update on public.downloads for each row execute function public.handle_updated_at();
create trigger ratings_updated_at before update on public.ratings for each row execute function public.handle_updated_at();
create trigger feedback_updated_at before update on public.feedback for each row execute function public.handle_updated_at();
create trigger featured_placements_updated_at before update on public.featured_placements for each row execute function public.handle_updated_at();
create trigger play_reports_updated_at before update on public.play_reports for each row execute function public.handle_updated_at();
create trigger admin_reviews_updated_at before update on public.admin_reviews for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Role extension rows (runs after profile exists; SECURITY DEFINER bypasses RLS)
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
  end if;
  return new;
end;
$$;

create trigger profiles_sync_role_extensions_insert
  after insert on public.profiles
  for each row execute function public.sync_profile_role_extensions();

create trigger profiles_sync_role_extensions_update
  after update of role, full_name on public.profiles
  for each row execute function public.sync_profile_role_extensions();

-- Backfill for existing rows (safe if empty)
insert into public.artists (profile_id, display_name, status)
select p.id, coalesce(nullif(trim(p.full_name), ''), 'Artist'), 'active'::public.lifecycle_status
from public.profiles p
where p.role = 'artist'
  and not exists (select 1 from public.artists a where a.profile_id = p.id);

insert into public.djs (profile_id, display_name, status)
select p.id, coalesce(nullif(trim(p.full_name), ''), 'DJ'), 'active'::public.lifecycle_status
from public.profiles p
where p.role = 'dj'
  and not exists (select 1 from public.djs d where d.profile_id = p.id);

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER — avoid recursive policy checks)
-- ---------------------------------------------------------------------------

create or replace function public.current_artist_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.id from public.artists a where a.profile_id = auth.uid() limit 1;
$$;

create or replace function public.current_dj_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id from public.djs d where d.profile_id = auth.uid() limit 1;
$$;

create or replace function public.track_is_visible_to_dj(p_track_id uuid)
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
      and tr.moderation_status = 'approved'::public.approval_status
      and ar.status = 'active'::public.lifecycle_status
  );
$$;

create or replace function public.artist_owns_track(p_track_id uuid, p_profile_id uuid)
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
      and ar.profile_id = p_profile_id
  );
$$;

grant execute on function public.current_artist_id() to authenticated;
grant execute on function public.current_dj_id() to authenticated;
grant execute on function public.track_is_visible_to_dj(uuid) to authenticated;
grant execute on function public.artist_owns_track(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.artists enable row level security;
alter table public.djs enable row level security;
alter table public.tracks enable row level security;
alter table public.dj_packs enable row level security;
alter table public.track_files enable row level security;
alter table public.downloads enable row level security;
alter table public.ratings enable row level security;
alter table public.feedback enable row level security;
alter table public.featured_placements enable row level security;
alter table public.play_reports enable row level security;
alter table public.admin_reviews enable row level security;

-- ---------------------------------------------------------------------------
-- artists
-- ---------------------------------------------------------------------------

create policy "artists_select_authenticated"
  on public.artists for select
  to authenticated
  using (true);

create policy "artists_insert_own_profile"
  on public.artists for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'artist'::public.user_role
    )
  );

create policy "artists_update_own_or_admin"
  on public.artists for update
  to authenticated
  using (profile_id = auth.uid() or public.is_admin(auth.uid()))
  with check (profile_id = auth.uid() or public.is_admin(auth.uid()));

create policy "artists_delete_admin"
  on public.artists for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- djs
-- ---------------------------------------------------------------------------

create policy "djs_select_authenticated"
  on public.djs for select
  to authenticated
  using (true);

create policy "djs_insert_own_profile"
  on public.djs for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'dj'::public.user_role
    )
  );

create policy "djs_update_own_or_admin"
  on public.djs for update
  to authenticated
  using (profile_id = auth.uid() or public.is_admin(auth.uid()))
  with check (profile_id = auth.uid() or public.is_admin(auth.uid()));

create policy "djs_delete_admin"
  on public.djs for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- tracks
-- ---------------------------------------------------------------------------

create policy "tracks_select_scope"
  on public.tracks for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(id, auth.uid())
    or public.track_is_visible_to_dj(id)
  );

create policy "tracks_insert_owner_artist"
  on public.tracks for insert
  to authenticated
  with check (
    artist_id = public.current_artist_id()
    and public.current_artist_id() is not null
  );

create policy "tracks_update_owner_or_admin"
  on public.tracks for update
  to authenticated
  using (public.artist_owns_track(id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.artist_owns_track(id, auth.uid()) or public.is_admin(auth.uid()));

create policy "tracks_delete_owner_or_admin"
  on public.tracks for delete
  to authenticated
  using (public.artist_owns_track(id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- dj_packs
-- ---------------------------------------------------------------------------

create policy "dj_packs_select_scope"
  on public.dj_packs for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
  );

create policy "dj_packs_insert_own"
  on public.dj_packs for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.current_dj_id() is not null
  );

create policy "dj_packs_update_own_or_admin"
  on public.dj_packs for update
  to authenticated
  using (dj_id = public.current_dj_id() or public.is_admin(auth.uid()))
  with check (dj_id = public.current_dj_id() or public.is_admin(auth.uid()));

create policy "dj_packs_delete_own_or_admin"
  on public.dj_packs for delete
  to authenticated
  using (dj_id = public.current_dj_id() or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- track_files
-- ---------------------------------------------------------------------------

create policy "track_files_select_scope"
  on public.track_files for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or public.track_is_visible_to_dj(track_id)
  );

create policy "track_files_write_owner_artist_or_admin"
  on public.track_files for insert
  to authenticated
  with check (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
  );

create policy "track_files_update_owner_or_admin"
  on public.track_files for update
  to authenticated
  using (public.artist_owns_track(track_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.artist_owns_track(track_id, auth.uid()) or public.is_admin(auth.uid()));

create policy "track_files_delete_owner_or_admin"
  on public.track_files for delete
  to authenticated
  using (public.artist_owns_track(track_id, auth.uid()) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- downloads
-- ---------------------------------------------------------------------------

create policy "downloads_select_scope"
  on public.downloads for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
  );

create policy "downloads_insert_dj_approved_track"
  on public.downloads for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.track_is_visible_to_dj(track_id)
  );

create policy "downloads_update_scope"
  on public.downloads for update
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
  );

create policy "downloads_delete_admin"
  on public.downloads for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------------------

create policy "ratings_select_scope"
  on public.ratings for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or dj_id = public.current_dj_id()
    or public.track_is_visible_to_dj(track_id)
  );

create policy "ratings_insert_dj"
  on public.ratings for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.track_is_visible_to_dj(track_id)
  );

create policy "ratings_update_own_or_admin"
  on public.ratings for update
  to authenticated
  using (dj_id = public.current_dj_id() or public.is_admin(auth.uid()))
  with check (dj_id = public.current_dj_id() or public.is_admin(auth.uid()));

create policy "ratings_delete_own_or_admin"
  on public.ratings for delete
  to authenticated
  using (dj_id = public.current_dj_id() or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- feedback
-- ---------------------------------------------------------------------------

create policy "feedback_select_scope"
  on public.feedback for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or dj_id = public.current_dj_id()
    or (
      public.track_is_visible_to_dj(track_id)
      and moderation_status = 'approved'::public.approval_status
    )
  );

create policy "feedback_insert_dj"
  on public.feedback for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.track_is_visible_to_dj(track_id)
  );

create policy "feedback_update_scope"
  on public.feedback for update
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
  );

create policy "feedback_delete_admin"
  on public.feedback for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- featured_placements
-- ---------------------------------------------------------------------------

create policy "featured_placements_select_scope"
  on public.featured_placements for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or (
      public.track_is_visible_to_dj(track_id)
      and moderation_status = 'approved'::public.approval_status
    )
  );

create policy "featured_placements_write_admin"
  on public.featured_placements for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "featured_placements_update_admin"
  on public.featured_placements for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "featured_placements_delete_admin"
  on public.featured_placements for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- play_reports
-- ---------------------------------------------------------------------------

create policy "play_reports_select_scope"
  on public.play_reports for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
  );

create policy "play_reports_insert_dj"
  on public.play_reports for insert
  to authenticated
  with check (
    dj_id = public.current_dj_id()
    and public.track_is_visible_to_dj(track_id)
  );

create policy "play_reports_update_scope"
  on public.play_reports for update
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
    or public.artist_owns_track(track_id, auth.uid())
  );

create policy "play_reports_delete_admin"
  on public.play_reports for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- admin_reviews
-- ---------------------------------------------------------------------------

create policy "admin_reviews_select_scope"
  on public.admin_reviews for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
  );

create policy "admin_reviews_write_admin"
  on public.admin_reviews for insert
  to authenticated
  with check (
    public.is_admin(auth.uid())
    and reviewer_id = auth.uid()
  );

create policy "admin_reviews_update_admin"
  on public.admin_reviews for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "admin_reviews_delete_admin"
  on public.admin_reviews for delete
  to authenticated
  using (public.is_admin(auth.uid()));

commit;
