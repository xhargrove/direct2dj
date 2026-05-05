-- DJs who share an organization can read each other's membership rows (same org only).
-- Artists and DJs outside that org cannot see those rows (RLS + current_dj_id()).

begin;

create policy "dj_organization_members_select_peer_same_org"
  on public.dj_organization_members for select
  to authenticated
  using (
    exists (
      select 1
      from public.dj_organization_members my_membership
      where my_membership.dj_id = public.current_dj_id()
        and my_membership.organization_id = dj_organization_members.organization_id
    )
  );

commit;
