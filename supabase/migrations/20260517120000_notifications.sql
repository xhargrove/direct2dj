-- In-app notifications + idempotency helpers for featured placement alerts.

begin;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_kind_nonempty check (length(trim(kind)) > 0),
  constraint notifications_title_nonempty check (length(trim(title)) > 0)
);

comment on table public.notifications is 'Per-user inbox; inserts from trusted server code (service role).';
comment on column public.notifications.kind is 'Stable code for filtering/analytics (e.g. track_approved, featured_started).';
comment on column public.notifications.metadata is 'Structured payload for links and dedupe keys (track_id, placement_id, etc.).';

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.featured_placements
  add column if not exists start_notified_at timestamptz;

alter table public.featured_placements
  add column if not exists expiry_notified_at timestamptz;

comment on column public.featured_placements.start_notified_at is 'Set when artist + DJ “featured started” notifications were emitted.';
comment on column public.featured_placements.expiry_notified_at is 'Set when artist “featured expired” notification was emitted.';

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own_read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
