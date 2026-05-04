-- Idempotent: guarantee active submission tier exists (fixes environments where prior migration did not insert).

begin;

insert into public.pricing_plans (slug, label, duration_days, price_cents, sort_order, plan_kind, active)
values
  ('submission_single', 'Single release upload', 0, 999, 5, 'submission', true)
on conflict (slug) do update set
  label = excluded.label,
  duration_days = excluded.duration_days,
  price_cents = excluded.price_cents,
  sort_order = excluded.sort_order,
  plan_kind = 'submission',
  active = true,
  updated_at = now();

commit;
