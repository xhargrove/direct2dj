-- Artists read submission SKUs reliably without depending on RLS + anon service role in Next.js.

begin;

create or replace function public.list_active_submission_pricing_plans()
returns table (
  id uuid,
  slug text,
  label text,
  price_cents integer,
  currency text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.slug,
    p.label,
    p.price_cents,
    p.currency,
    p.sort_order
  from public.pricing_plans p
  where p.active = true
    and position('submission_' in p.slug) = 1
  order by p.sort_order asc nulls last;
$$;

comment on function public.list_active_submission_pricing_plans() is
  'Public catalog: active submission tiers (slug prefix submission_). Bypasses RLS for authenticated reads.';

revoke all on function public.list_active_submission_pricing_plans() from public;
grant execute on function public.list_active_submission_pricing_plans() to authenticated;

commit;
