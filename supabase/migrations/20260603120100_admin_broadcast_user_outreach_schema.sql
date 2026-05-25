-- Column + constraint for User outreach (run after enum values migration).

alter table public.admin_broadcasts
  add column if not exists target_profile_id uuid references public.profiles (id) on delete set null;

alter table public.admin_broadcasts drop constraint if exists admin_broadcasts_single_dj_target;
alter table public.admin_broadcasts drop constraint if exists admin_broadcasts_target_check;

alter table public.admin_broadcasts add constraint admin_broadcasts_target_check check (
  (
    audience::text = 'single_dj'
    and target_dj_id is not null
    and target_profile_id is null
  )
  or (
    audience::text = 'single_profile'
    and target_profile_id is not null
    and target_dj_id is null
  )
  or (
    audience::text in ('all_approved_djs', 'pending_djs')
    and target_dj_id is null
    and target_profile_id is null
  )
);

comment on column public.admin_broadcasts.target_profile_id is
  'When audience = single_profile, the recipient profile id.';
