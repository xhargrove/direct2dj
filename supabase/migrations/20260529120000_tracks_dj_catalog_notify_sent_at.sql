-- Idempotency for fan-out “new track in Discover” notifications to approved DJs.

begin;

alter table public.tracks
  add column if not exists dj_catalog_notify_sent_at timestamptz;

comment on column public.tracks.dj_catalog_notify_sent_at is
  'Set once when in-app notifications were sent to approved DJs for this track appearing in the catalog.';

commit;
