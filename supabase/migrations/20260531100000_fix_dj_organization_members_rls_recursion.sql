-- Peer-select policy subqueried dj_organization_members from within dj_organization_members RLS → infinite recursion.
-- Replace with a SECURITY DEFINER helper that reads membership without re-entering RLS (same pattern as current_dj_id).

begin;

drop policy if exists "dj_organization_members_select_peer_same_org" on public.dj_organization_members;

create or replace function public.current_dj_in_organization(p_organization_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Inner read must not re-evaluate dj_organization_members RLS (prevents infinite recursion).
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.dj_organization_members m
    where m.organization_id = p_organization_id
      and m.dj_id = public.current_dj_id()
  );
end;
$$;

comment on function public.current_dj_in_organization(uuid) is
  'True if the authenticated user''s DJ row is a member of the organization. Used by RLS to avoid recursive policy checks on dj_organization_members.';

revoke all on function public.current_dj_in_organization(uuid) from public;
grant execute on function public.current_dj_in_organization(uuid) to authenticated;

create policy "dj_organization_members_select_peer_same_org"
  on public.dj_organization_members for select
  to authenticated
  using (public.current_dj_in_organization(dj_organization_members.organization_id));

commit;
