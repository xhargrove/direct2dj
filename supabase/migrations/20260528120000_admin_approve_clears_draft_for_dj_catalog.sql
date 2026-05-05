-- Approving a track must publish it to the DJ catalog: track_is_visible_to_dj requires is_draft = false.
-- Previously admin_apply_track_review only set moderation_status, leaving is_draft true so DJs saw nothing.

begin;

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
      is_draft = false,
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
  'Admin-only: updates tracks moderation + inserts admin_reviews. On approve, clears is_draft so DJs can see the track.';

-- Fix already-approved rows that were left in draft.
update public.tracks
set
  is_draft = false,
  updated_at = now()
where moderation_status = 'approved'::public.approval_status
  and is_draft = true;

commit;
