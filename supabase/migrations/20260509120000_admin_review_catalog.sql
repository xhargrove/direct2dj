-- Admin review: rejection reason, catalog visibility, admin tags; DJ featured expiry in RLS;
-- admins can read all promos objects for review.

begin;

alter table public.tracks
  add column if not exists rejection_reason text,
  add column if not exists catalog_active boolean not null default true,
  add column if not exists admin_tags text[] not null default '{}';

comment on column public.tracks.rejection_reason is 'Set when moderation_status is rejected; cleared on approve.';
comment on column public.tracks.catalog_active is 'When false, track is hidden from the DJ catalog even if approved.';
comment on column public.tracks.admin_tags is 'Genre/category tags assigned by admins for catalog organization.';

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
      and tr.catalog_active = true
      and ar.status = 'active'::public.lifecycle_status
  );
$$;

-- DJs only see featured placements that are approved and within the active window.
drop policy if exists "featured_placements_select_scope" on public.featured_placements;

create policy "featured_placements_select_scope"
  on public.featured_placements for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or (
      public.track_is_visible_to_dj(track_id)
      and moderation_status = 'approved'::public.approval_status
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
  );

-- Non-admins cannot change admin-assigned track fields (even if they own the track).
create or replace function public.tracks_protect_admin_only_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin(auth.uid()) then
    return new;
  end if;
  new.rejection_reason := old.rejection_reason;
  new.catalog_active := old.catalog_active;
  new.admin_tags := old.admin_tags;
  return new;
end;
$$;

drop trigger if exists tracks_protect_admin_only_columns on public.tracks;
create trigger tracks_protect_admin_only_columns
  before update on public.tracks
  for each row execute function public.tracks_protect_admin_only_columns();

comment on function public.tracks_protect_admin_only_columns() is
  'Non-admins cannot change rejection_reason, catalog_active, or admin_tags.';

-- Idempotent: remote may already have this policy if applied out-of-band.
drop policy if exists "promos_select_admin" on storage.objects;

create policy "promos_select_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'promos'
    and public.is_admin(auth.uid())
  );

commit;
