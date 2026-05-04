-- MVP performance: common FK lookups and featured/expiry sweep helpers.

begin;

create index if not exists djs_profile_id_idx on public.djs (profile_id);

create index if not exists featured_placements_ends_at_active_idx
  on public.featured_placements (ends_at)
  where moderation_status = 'approved'::public.approval_status;

create index if not exists play_reports_track_played_idx
  on public.play_reports (track_id, played_at desc);

commit;
