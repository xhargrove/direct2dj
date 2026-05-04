-- DJ pack metadata on tracks + pack_slot on track_files (complete-pack submission)

begin;

create type public.explicit_rating as enum ('explicit', 'clean');

create type public.pack_slot as enum (
  'cover_art',
  'radio_edit',
  'dirty_full',
  'instrumental',
  'acapella',
  'intro_edit',
  'short_edit'
);

alter table public.tracks
  add column credit_artist_name text not null default '',
  add column featured_artist text,
  add column producer text,
  add column genre text not null default '',
  add column bpm numeric(7, 2),
  add column musical_key text,
  add column explicit_rating public.explicit_rating not null default 'clean',
  add column release_date date,
  add column campaign_notes text,
  add column is_draft boolean not null default true;

comment on column public.tracks.is_draft is 'false once artist submits a complete DJ pack for admin review; still moderation pending until approved';

-- Existing published/rejected rows are finalized packs, not drafts
update public.tracks
set is_draft = false
where moderation_status in ('approved', 'rejected');

alter table public.track_files
  add column pack_slot public.pack_slot;

create unique index track_files_track_pack_slot_unique
  on public.track_files (track_id, pack_slot)
  where pack_slot is not null;

comment on column public.track_files.pack_slot is 'DJ pack role; required set enforced in application before submit';

commit;
