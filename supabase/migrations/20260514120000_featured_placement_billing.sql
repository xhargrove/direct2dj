-- Featured placement billing: configurable pricing plans, payments, paid activation via Stripe.

begin;

-- ---------------------------------------------------------------------------
-- Catalog (admin-seeded; prices editable in SQL or future admin UI)
-- ---------------------------------------------------------------------------

create table public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  duration_days integer not null check (duration_days > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  stripe_price_id text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pricing_plans is 'DJ feed feature durations and prices (USD cents by default).';

create trigger pricing_plans_updated_at
  before update on public.pricing_plans
  for each row execute function public.handle_updated_at();

insert into public.pricing_plans (slug, label, duration_days, price_cents, sort_order)
values
  ('feature_3d', '3-day feature', 3, 2900, 10),
  ('feature_7d', '7-day feature', 7, 4900, 20),
  ('feature_14d', '14-day feature', 14, 8900, 30),
  ('feature_30d', '30-day feature', 30, 14900, 40);

-- ---------------------------------------------------------------------------
-- Payments (checkout rows; placement created only after Stripe confirms payment)
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  pricing_plan_id uuid not null references public.pricing_plans (id),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payments is 'Stripe Checkout attempts and outcomes; featured row is created only when status becomes succeeded.';

create index payments_artist_id_idx on public.payments (artist_id);
create index payments_track_id_idx on public.payments (track_id);
create index payments_status_idx on public.payments (status);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Featured placements: link optional paid checkout; distinguish admin comps
-- ---------------------------------------------------------------------------

alter table public.featured_placements
  add column if not exists payment_id uuid references public.payments (id) on delete set null;

alter table public.featured_placements
  add column if not exists activation_source text;

update public.featured_placements
set activation_source = 'admin_comp'
where activation_source is null;

alter table public.featured_placements
  alter column activation_source set not null;

alter table public.featured_placements
  alter column activation_source set default 'paid_checkout';

alter table public.featured_placements
  add constraint featured_placements_activation_source_chk
  check (activation_source in ('paid_checkout', 'admin_comp'));

comment on column public.featured_placements.payment_id is 'Set when placement was purchased via Stripe checkout.';
comment on column public.featured_placements.activation_source is 'paid_checkout: Stripe webhook; admin_comp: manual admin placement.';

create unique index featured_placements_one_payment_uidx
  on public.featured_placements (payment_id)
  where payment_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.pricing_plans enable row level security;
alter table public.payments enable row level security;

create policy "pricing_plans_select_catalog"
  on public.pricing_plans for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or active = true
  );

create policy "payments_select_own_or_admin"
  on public.payments for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or artist_id = public.current_artist_id()
  );

create policy "payments_insert_own_eligible_track"
  on public.payments for insert
  to authenticated
  with check (
    artist_id = public.current_artist_id()
    and public.current_artist_id() is not null
    and exists (
      select 1
      from public.tracks t
      where t.id = track_id
        and t.artist_id = artist_id
        and t.moderation_status = 'approved'::public.approval_status
        and t.catalog_active = true
    )
  );

create policy "payments_admin_all"
  on public.payments for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

commit;
