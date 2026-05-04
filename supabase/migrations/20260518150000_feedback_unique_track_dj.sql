begin;

-- One feedback row per (track_id, dj_id). Dedupe by keeping the latest touch (updated_at, then created_at, then id).
-- Using UUID id alone is arbitrary; timestamp order matches product intent.
delete from public.feedback f
where f.id not in (
  select distinct on (track_id, dj_id) id
  from public.feedback
  order by
    track_id,
    dj_id,
    updated_at desc nulls last,
    created_at desc nulls last,
    id desc
);

create unique index if not exists feedback_track_dj_uidx on public.feedback (track_id, dj_id);

commit;
