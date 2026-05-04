begin;

-- tracks INSERT: require the new row's artist_id to be the current user's artist row.
-- Logically the same as artist_id = current_artist_id() but uses an explicit EXISTS on
-- public.artists so evaluation does not depend on the SECURITY DEFINER helper inside WITH CHECK.

drop policy if exists "tracks_insert_owner_artist" on public.tracks;

create policy "tracks_insert_owner_artist"
  on public.tracks for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.artists a
      where a.id = artist_id
        and a.profile_id = auth.uid()
    )
  );

commit;
