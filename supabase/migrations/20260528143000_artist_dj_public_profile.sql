-- Artist-facing DJ profile details for direct outreach.
-- Access is limited to artists and only for DJs who interacted with that artist's tracks.

begin;

drop function if exists public.artist_dj_public_profile(uuid);

create or replace function public.artist_dj_public_profile(p_dj_id uuid)
returns table (
  dj_id uuid,
  display_name text,
  bio text,
  city text,
  state text,
  dj_tier public.dj_tier,
  vetting_status public.dj_vetting_status,
  allow_artist_contact boolean,
  contact_email text,
  instagram text,
  phone text,
  mixcloud_soundcloud_url text,
  club_radio_affiliation text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  aid uuid := public.current_artist_id();
begin
  if aid is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.tracks t
    where t.artist_id = aid
      and (
        exists (select 1 from public.downloads d where d.track_id = t.id and d.dj_id = p_dj_id)
        or exists (select 1 from public.ratings r where r.track_id = t.id and r.dj_id = p_dj_id)
        or exists (select 1 from public.feedback f where f.track_id = t.id and f.dj_id = p_dj_id)
        or exists (select 1 from public.play_reports pr where pr.track_id = t.id and pr.dj_id = p_dj_id)
      )
  ) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    d.id,
    d.display_name,
    d.bio,
    d.city,
    d.state,
    d.dj_tier,
    d.vetting_status,
    d.allow_artist_contact,
    case when d.allow_artist_contact then p.email else null end as contact_email,
    case when d.allow_artist_contact then da.instagram else null end as instagram,
    case when d.allow_artist_contact then da.phone else null end as phone,
    case when d.allow_artist_contact then da.mixcloud_soundcloud_url else null end as mixcloud_soundcloud_url,
    case when d.allow_artist_contact then da.club_radio_affiliation else null end as club_radio_affiliation
  from public.djs d
  left join public.profiles p on p.id = d.profile_id
  left join public.dj_applications da on da.dj_id = d.id
  where d.id = p_dj_id
  limit 1;
end;
$$;

grant execute on function public.artist_dj_public_profile(uuid) to authenticated;

comment on function public.artist_dj_public_profile(uuid) is
  'Artist-only: returns DJ profile plus contact fields only when allow_artist_contact is true and the DJ has interacted with the artist''s tracks.';

commit;
