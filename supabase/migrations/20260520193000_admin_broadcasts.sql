-- Admin-composed in-app announcements to DJs (audit log; fan-out via notifications table).

begin;

create type public.admin_broadcast_audience as enum ('all_approved_djs', 'single_dj');

create table public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  href text,
  audience public.admin_broadcast_audience not null,
  target_dj_id uuid references public.djs (id) on delete set null,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_at timestamptz not null default now(),
  constraint admin_broadcasts_title_nonempty check (length(trim(title)) > 0),
  constraint admin_broadcasts_single_dj_target check (
    (audience = 'single_dj' and target_dj_id is not null)
    or (audience = 'all_approved_djs' and target_dj_id is null)
  )
);

comment on table public.admin_broadcasts is
  'Audit log for Backstage announcements to DJs; notification rows reference broadcast_id in metadata.';
comment on column public.admin_broadcasts.recipient_count is
  'Number of in-app notification rows emitted for this send.';

create index admin_broadcasts_created_idx on public.admin_broadcasts (created_at desc);

alter table public.admin_broadcasts enable row level security;

create policy "admin_broadcasts_select_admin"
  on public.admin_broadcasts for select
  to authenticated
  using (public.is_admin(auth.uid()));

commit;
