-- Optional YouTube video associated with a track upload (artist + admin/co-admin).

begin;

alter table public.tracks
  add column if not exists youtube_url text;

comment on column public.tracks.youtube_url is
  'Optional canonical YouTube watch URL for the official video tied to this release.';

alter table public.tracks
  drop constraint if exists tracks_youtube_url_format;

alter table public.tracks
  add constraint tracks_youtube_url_format check (
    youtube_url is null
    or (
      length(youtube_url) <= 500
      and youtube_url ~* '^https://(www\.)?youtube\.com/watch\?v=[\w-]{11}(&.*)?$'
    )
  );

commit;
