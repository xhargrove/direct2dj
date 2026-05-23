-- Wire new editorial spotlight slots into the public hub RPC (run after enum migration commits).

create or replace function public.public_spotlight_hub(p_limit_per_section integer default 8)
returns table (
  section text,
  editorial_id uuid,
  headline text,
  track_id uuid,
  title text,
  credit_artist_name text,
  genre text,
  bpm numeric,
  explicit_rating text,
  artist_display_name text,
  cover_storage_path text,
  youtube_url text,
  metric_value bigint,
  metric_label text,
  placement_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.public_spotlight_editorial('record_of_week'::public.editorial_spotlight_slot)
  union all
  select * from public.public_spotlight_editorial('dj_pick'::public.editorial_spotlight_slot)
  union all
  select * from public.public_spotlight_editorial('new_release'::public.editorial_spotlight_slot)
  union all
  select * from public.public_spotlight_editorial('artist_spotlight'::public.editorial_spotlight_slot)
  union all
  select * from public.public_spotlight_editorial('must_spin'::public.editorial_spotlight_slot)
  union all
  select * from public.public_spotlight_sponsored(p_limit_per_section)
  union all
  select * from public.public_spotlight_leaderboard('trending', p_limit_per_section, 7)
  union all
  select * from public.public_spotlight_leaderboard('most_downloaded', p_limit_per_section, 30)
  union all
  select * from public.public_spotlight_leaderboard('most_feedback', p_limit_per_section, 30);
$$;
