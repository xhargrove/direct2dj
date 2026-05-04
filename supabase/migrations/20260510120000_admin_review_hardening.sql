-- Hardening pass: defense-in-depth moderation protection, featured window semantics,
-- append-only admin_reviews, atomic admin review RPC.

begin;

-- ---------------------------------------------------------------------------
-- tracks: non-admins cannot change moderation_status except artist resubmit
-- (rejected → pending). Complements tracks_enforce_moderation_rules (which raises).
-- Order: tracks_enforce_moderation_rules runs before tracks_protect_admin_only_columns.
-- ---------------------------------------------------------------------------

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

  if old.moderation_status is distinct from new.moderation_status then
    if not (
      old.moderation_status = 'rejected'::public.approval_status
      and new.moderation_status = 'pending'::public.approval_status
      and public.artist_owns_track(old.id, auth.uid())
    ) then
      new.moderation_status := old.moderation_status;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.tracks_protect_admin_only_columns() is
  'Non-admins cannot change rejection_reason, catalog_active, admin_tags, or moderation_status '
  'except the allowed artist resubmit rejected→pending.';

-- ---------------------------------------------------------------------------
-- Featured placements: DJ-visible rows use inclusive end boundary; NULL ends_at = open-ended.
-- ---------------------------------------------------------------------------

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
      and (ends_at is null or ends_at >= now())
    )
  );

comment on policy "featured_placements_select_scope" on public.featured_placements is
  'DJs see approved placements in [starts_at, ends_at]; NULL starts_at = immediately eligible; '
  'NULL ends_at = open-ended until changed.';

-- ---------------------------------------------------------------------------
-- admin_reviews: append-only audit (no update/delete via RLS for authenticated).
-- Corrections use the Supabase SQL editor / service role in break-glass scenarios.
-- ---------------------------------------------------------------------------

drop policy if exists "admin_reviews_update_admin" on public.admin_reviews;
drop policy if exists "admin_reviews_delete_admin" on public.admin_reviews;

comment on table public.admin_reviews is
  'Append-only admin decisions on tracks. INSERT allowed for admins (reviewer_id = auth.uid()). '
  'UPDATE/DELETE are not granted to authenticated roles to preserve audit integrity.';

-- ---------------------------------------------------------------------------
-- Atomic approve/reject: single transaction, reviewer_id = session admin.
-- SECURITY DEFINER: runs with definer privileges; gate on is_admin(auth.uid()) only.
-- ---------------------------------------------------------------------------

create or replace function public.admin_apply_track_review(
  p_track_id uuid,
  p_decision public.approval_status,
  p_rejection_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Forbidden'
      using errcode = '42501';
  end if;

  if p_decision = 'approved'::public.approval_status then
    update public.tracks
    set
      moderation_status = 'approved'::public.approval_status,
      rejection_reason = null,
      updated_at = now()
    where id = p_track_id;

    insert into public.admin_reviews (track_id, reviewer_id, decision, notes)
    values (p_track_id, auth.uid(), 'approved'::public.approval_status, null);

  elsif p_decision = 'rejected'::public.approval_status then
    if p_rejection_reason is null or btrim(p_rejection_reason) = '' then
      raise exception 'Rejection reason is required'
        using errcode = '23514';
    end if;

    update public.tracks
    set
      moderation_status = 'rejected'::public.approval_status,
      rejection_reason = btrim(p_rejection_reason),
      updated_at = now()
    where id = p_track_id;

    insert into public.admin_reviews (track_id, reviewer_id, decision, notes)
    values (p_track_id, auth.uid(), 'rejected'::public.approval_status, btrim(p_rejection_reason));

  else
    raise exception 'Invalid decision'
      using errcode = '23514';
  end if;
end;
$$;

comment on function public.admin_apply_track_review(uuid, public.approval_status, text) is
  'Admin-only: updates tracks moderation + inserts admin_reviews in one transaction. '
  'Caller must be an admin JWT (not the service role key in app code).';

grant execute on function public.admin_apply_track_review(uuid, public.approval_status, text) to authenticated;

create index if not exists track_files_storage_path_idx on public.track_files (storage_path);

commit;
