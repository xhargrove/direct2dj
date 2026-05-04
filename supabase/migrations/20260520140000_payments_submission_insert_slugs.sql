-- Allow submission payments when plan_kind is missing but slug is a submission SKU (legacy / partial migrations).

begin;

drop policy if exists "payments_insert_own_eligible_track" on public.payments;

create policy "payments_insert_own_eligible_track"
  on public.payments for insert
  to authenticated
  with check (
    artist_id = public.current_artist_id()
    and public.current_artist_id() is not null
    and (
      (
        track_id is not null
        and exists (
          select 1
          from public.tracks t
          where t.id = track_id
            and t.artist_id = artist_id
            and t.moderation_status = 'approved'::public.approval_status
            and t.catalog_active = true
        )
      )
      or (
        track_id is null
        and exists (
          select 1
          from public.pricing_plans p
          where p.id = pricing_plan_id
            and p.active = true
            and (
              p.plan_kind = 'submission'
              or position('submission_' in p.slug) = 1
            )
        )
      )
    )
  );

commit;
