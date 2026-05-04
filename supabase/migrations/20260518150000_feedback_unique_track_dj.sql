begin;

-- One feedback row per (track_id, dj_id); app updates existing row on resubmit.
delete from public.feedback a
using public.feedback b
where a.track_id = b.track_id
  and a.dj_id = b.dj_id
  and a.id < b.id;

create unique index if not exists feedback_track_dj_uidx on public.feedback (track_id, dj_id);

commit;
