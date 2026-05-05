-- Unify all "Coalition …" crew names into one organization: name_key coalition_djs, display Coalition DJs.
-- Updates RPC + merges existing fragmented rows.

begin;

-- ---------------------------------------------------------------------------
-- RPC: first word "coalition" (case-insensitive) → canonical Coalition DJs org
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
  first_w text;
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

  first_w := lower(split_part(trimmed, ' ', 1));

  if first_w = 'coalition' then
    nk := 'coalition djs';
    trimmed := 'Coalition DJs';
  else
    nk := lower(trimmed);
  end if;

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
  'Authenticated DJ: join/create organization. Names whose first word is Coalition map to the single Coalition DJs org.';

-- ---------------------------------------------------------------------------
-- One-time merge: existing Coalition* org rows → canonical coalition djs
-- ---------------------------------------------------------------------------

insert into public.dj_organizations (name_key, display_name, moderation_status)
values ('coalition djs', 'Coalition DJs', 'pending'::public.approval_status)
on conflict (name_key) do nothing;

do $$
declare
  canon_id uuid;
begin
  select id into canon_id from public.dj_organizations where name_key = 'coalition djs' limit 1;
  if canon_id is null then
    raise exception 'Canonical Coalition org missing after insert';
  end if;

  update public.dj_organization_members m
  set organization_id = canon_id
  from public.dj_organizations o
  where m.organization_id = o.id
    and o.id <> canon_id
    and lower(split_part(regexp_replace(trim(o.display_name), '\s+', ' ', 'g'), ' ', 1)) = 'coalition';

  with coalition_orgs as (
    select *
    from public.dj_organizations o
    where lower(split_part(regexp_replace(trim(o.display_name), '\s+', ' ', 'g'), ' ', 1)) = 'coalition'
  )
  update public.dj_organizations c
  set
    display_name = 'Coalition DJs',
    moderation_status = case
      when (
        select bool_or(o.moderation_status = 'approved'::public.approval_status)
        from coalition_orgs o
      )
      then 'approved'::public.approval_status
      else c.moderation_status
    end,
    formed_at = coalesce(
      (
        select min(o.formed_at)
        from coalition_orgs o
        where o.formed_at is not null
      ),
      c.formed_at
    )
  where c.id = canon_id;

  delete from public.dj_organizations o
  where o.id <> canon_id
    and lower(split_part(regexp_replace(trim(o.display_name), '\s+', ' ', 'g'), ' ', 1)) = 'coalition';
end;
$$;

commit;
