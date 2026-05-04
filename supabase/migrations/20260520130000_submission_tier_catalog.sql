-- Artist submission tiers: $99 / $199 / $299 / $500 (replaces single submission_single SKU).

begin;

update public.pricing_plans
set active = false, updated_at = now()
where slug = 'submission_single';

insert into public.pricing_plans (slug, label, duration_days, price_cents, sort_order, plan_kind, active)
values
  ('submission_basic', 'Basic upload', 0, 9900, 10, 'submission', true),
  (
    'submission_feedback_reports',
    'DJ feedback & play reports',
    0,
    19900,
    20,
    'submission',
    true
  ),
  (
    'submission_pro_email',
    'Upload, DJ feedback & email service',
    0,
    29900,
    30,
    'submission',
    true
  ),
  (
    'submission_featured_bundle',
    'Featured Artist · upload, DJ feedback & email',
    0,
    50000,
    40,
    'submission',
    true
  )
on conflict (slug) do update set
  label = excluded.label,
  duration_days = excluded.duration_days,
  price_cents = excluded.price_cents,
  sort_order = excluded.sort_order,
  plan_kind = 'submission',
  active = excluded.active,
  updated_at = now();

commit;
