-- Rich DJ play reports: venue, location, crowd, proof link, self-reported vs admin-verified.

begin;

do $$ begin
  create type public.play_report_verification as enum ('self_reported', 'verified');
exception
  when duplicate_object then null;
end $$;

alter table public.play_reports
  add column if not exists venue_name text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists event_name text,
  add column if not exists played_at date,
  add column if not exists estimated_crowd_size text,
  add column if not exists crowd_reaction public.crowd_reaction,
  add column if not exists notes text,
  add column if not exists proof_url text,
  add column if not exists verification_status public.play_report_verification not null default 'self_reported';

comment on column public.play_reports.venue_name is 'Where the set happened.';
comment on column public.play_reports.played_at is 'Calendar date of the play.';
comment on column public.play_reports.estimated_crowd_size is 'Free-text estimate (e.g. 50–150).';
comment on column public.play_reports.verification_status is 'self_reported: DJ-submitted; verified: confirmed by admin.';

-- Backfill legacy one-click rows
update public.play_reports
set
  played_at = coalesce(played_at, period_start),
  venue_name = coalesce(nullif(trim(venue_name), ''), 'Not specified'),
  event_name = coalesce(nullif(trim(event_name), ''), 'Play report'),
  estimated_crowd_size = coalesce(nullif(trim(estimated_crowd_size), ''), '—'),
  notes = coalesce(notes, '')
where played_at is null
   or venue_name is null
   or event_name is null
   or estimated_crowd_size is null;

update public.play_reports set played_at = period_start where played_at is null;
update public.play_reports set venue_name = 'Not specified' where venue_name is null;
update public.play_reports set event_name = 'Play report' where event_name is null;
update public.play_reports set estimated_crowd_size = '—' where estimated_crowd_size is null;
update public.play_reports set notes = '' where notes is null;

alter table public.play_reports
  alter column venue_name set not null,
  alter column event_name set not null,
  alter column played_at set not null,
  alter column estimated_crowd_size set not null,
  alter column notes set not null;

-- Non-admins cannot flip verification to verified (or change status at all)
create or replace function public.play_reports_preserve_verification_unless_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if public.is_admin(auth.uid()) then
    return new;
  end if;
  new.verification_status := old.verification_status;
  return new;
end;
$$;

drop trigger if exists play_reports_preserve_verification on public.play_reports;

create trigger play_reports_preserve_verification
  before update on public.play_reports
  for each row
  execute function public.play_reports_preserve_verification_unless_admin();

-- Artists may read; only DJ (own) or admin may update — drop broad artist update
drop policy if exists "play_reports_update_scope" on public.play_reports;
drop policy if exists "play_reports_update_dj_own" on public.play_reports;
drop policy if exists "play_reports_update_admin" on public.play_reports;

create policy "play_reports_update_dj_own"
  on public.play_reports for update
  to authenticated
  using (dj_id = public.current_dj_id())
  with check (
    dj_id = public.current_dj_id()
    and public.current_dj_vetting_approved()
  );

create policy "play_reports_update_admin"
  on public.play_reports for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

commit;
