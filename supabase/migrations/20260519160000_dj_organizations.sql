-- DJ crews / organizations: DJs claim a name on application; 2+ members => "formed"; admin approves org.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.dj_organizations (
  id uuid primary key default gen_random_uuid(),
  name_key text not null unique,
  display_name text not null,
  moderation_status public.approval_status not null default 'pending',
  formed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.dj_organizations is
  'DJ crew or organization. name_key is normalized for matching; display_name is shown in UI. Admin approves moderation_status.';

comment on column public.dj_organizations.name_key is
  'Lowercased normalized key so "Night Crew" and "night crew" share one org.';

comment on column public.dj_organizations.formed_at is
  'Set when at least two DJs are members (signup milestone).';

create table if not exists public.dj_organization_members (
  dj_id uuid primary key references public.djs (id) on delete cascade,
  organization_id uuid not null references public.dj_organizations (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.dj_organization_members is 'Each DJ is in at most one organization.';

create index if not exists dj_organization_members_org_id_idx
  on public.dj_organization_members (organization_id);

drop trigger if exists dj_organizations_updated_at on public.dj_organizations;
create trigger dj_organizations_updated_at
  before update on public.dj_organizations
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Application snapshot: crew name for admin list (mirrors membership intent)
-- ---------------------------------------------------------------------------

alter table public.dj_applications
  add column if not exists crew_organization_name text;

comment on column public.dj_applications.crew_organization_name is
  'Optional crew/org name from onboarding; resolved via dj_set_organization_membership.';

-- ---------------------------------------------------------------------------
-- formed_at when membership reaches 2+
-- ---------------------------------------------------------------------------

create or replace function public._dj_org_touch_formed_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oid uuid;
  n int;
begin
  oid := coalesce(new.organization_id, old.organization_id);
  select count(*) into n from public.dj_organization_members where organization_id = oid;
  if n >= 2 then
    update public.dj_organizations
    set formed_at = coalesce(formed_at, now()),
        updated_at = now()
    where id = oid;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists dj_org_members_touch_formed on public.dj_organization_members;
create trigger dj_org_members_touch_formed
  after insert or delete or update of organization_id on public.dj_organization_members
  for each row execute function public._dj_org_touch_formed_at();

-- ---------------------------------------------------------------------------
-- RPC: DJ claims org membership (creates org row if needed)
-- ---------------------------------------------------------------------------

create or replace function public.dj_set_organization_membership(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  did uuid := public.current_dj_id();
  trimmed text;
  nk text;
  oid uuid;
begin
  if did is null then
    raise exception 'No DJ profile for this account' using errcode = 'P0001';
  end if;

  trimmed := trim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));

  if trimmed = '' then
    delete from public.dj_organization_members where dj_id = did;
    return;
  end if;

  if length(trimmed) < 2 then
    raise exception 'Organization name must be at least 2 characters' using errcode = 'P0001';
  end if;

  if length(trimmed) > 120 then
    raise exception 'Organization name is too long' using errcode = 'P0001';
  end if;

  nk := lower(trimmed);

  insert into public.dj_organizations (name_key, display_name, moderation_status)
  values (nk, trimmed, 'pending'::public.approval_status)
  on conflict (name_key) do nothing;

  select o.id into oid from public.dj_organizations o where o.name_key = nk limit 1;

  if oid is null then
    raise exception 'Organization lookup failed' using errcode = 'P0001';
  end if;

  delete from public.dj_organization_members where dj_id = did;

  insert into public.dj_organization_members (dj_id, organization_id)
  values (did, oid);
end;
$$;

comment on function public.dj_set_organization_membership(text) is
  'Authenticated DJ: join/create organization by display name (normalized). Empty string clears membership.';

revoke all on function public.dj_set_organization_membership(text) from public;
grant execute on function public.dj_set_organization_membership(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.dj_organizations enable row level security;
alter table public.dj_organization_members enable row level security;

create policy "dj_organizations_select_member_or_admin"
  on public.dj_organizations for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or (
      public.current_dj_id() is not null
      and exists (
        select 1
        from public.dj_organization_members m
        where m.organization_id = public.dj_organizations.id
          and m.dj_id = public.current_dj_id()
      )
    )
  );

create policy "dj_organizations_admin_update"
  on public.dj_organizations for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "dj_organization_members_select_own_or_admin"
  on public.dj_organization_members for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or dj_id = public.current_dj_id()
  );

commit;
