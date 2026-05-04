-- Paid submission: pricing plan kind + payments without track until webhook creates draft.

begin;

alter table public.pricing_plans
  add column if not exists plan_kind text not null default 'featured'
    check (plan_kind in ('featured', 'submission'));

comment on column public.pricing_plans.plan_kind is
  'featured = DJ feed placement duration; submission = one-time fee to open a new draft pack upload.';

update public.pricing_plans set plan_kind = 'featured' where plan_kind is null;

-- Replace duration_days > 0 rule so submission tiers can use duration_days = 0.
alter table public.pricing_plans drop constraint if exists pricing_plans_duration_days_check;

alter table public.pricing_plans
  add constraint pricing_plans_duration_days_by_kind_chk check (
    (plan_kind = 'submission' and duration_days = 0)
    or (plan_kind = 'featured' and duration_days > 0)
  );

insert into public.pricing_plans (slug, label, duration_days, price_cents, sort_order, plan_kind)
values
  ('submission_single', 'Single release upload', 0, 999, 5, 'submission')
on conflict (slug) do nothing;

alter table public.payments alter column track_id drop not null;

comment on column public.payments.track_id is
  'Nullable until Stripe confirms a submission checkout (draft track created server-side). Featured placements always set track_id when checkout starts.';

commit;
