-- Harden DJ vetting: DJs cannot self-approve; restore vetting gate on track_files SELECT for DJs.

begin;

create or replace function public.djs_protect_admin_only_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  new.dj_tier := old.dj_tier;

  if old.vetting_status is distinct from new.vetting_status then
    if not (
      old.vetting_status = 'rejected'::public.dj_vetting_status
      and new.vetting_status = 'pending'::public.dj_vetting_status
      and new.profile_id = auth.uid()
    ) then
      new.vetting_status := old.vetting_status;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.djs_protect_admin_only_columns() is
  'Non-admins cannot change dj_tier or vetting_status except resubmit rejected→pending on own row.';

drop trigger if exists djs_protect_admin_only_columns on public.djs;
create trigger djs_protect_admin_only_columns
  before update on public.djs
  for each row execute function public.djs_protect_admin_only_columns();

drop policy if exists "track_files_select_scope" on public.track_files;
create policy "track_files_select_scope"
  on public.track_files for select
  to authenticated
  using (
    public.is_upload_operator(auth.uid())
    or public.artist_owns_track(track_id, auth.uid())
    or (
      public.track_is_visible_to_dj(track_id)
      and public.current_dj_id() is not null
      and public.current_dj_vetting_approved()
    )
  );

commit;
