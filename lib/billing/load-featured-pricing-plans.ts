import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const FEATURED_SLUG_PREFIX = "feature_";

export type FeaturedPricingPlanRow = {
  id: string;
  label: string;
  price_cents: number;
  duration_days: number;
  currency: string | null;
};

export async function loadFeaturedPricingPlans(client: SupabaseClient): Promise<FeaturedPricingPlanRow[]> {
  const sel = "id, slug, label, price_cents, duration_days, currency, sort_order";

  const byKind = await client
    .from("pricing_plans")
    .select(sel)
    .eq("active", true)
    .eq("plan_kind", "featured")
    .order("sort_order", { ascending: true });

  if (!byKind.error && byKind.data && byKind.data.length > 0) {
    return byKind.data.map((r) => ({
      id: r.id as string,
      label: r.label as string,
      price_cents: r.price_cents as number,
      duration_days: r.duration_days as number,
      currency: r.currency as string | null,
    }));
  }

  const allActive = await client
    .from("pricing_plans")
    .select(sel)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (allActive.error || !allActive.data) {
    return [];
  }

  const filtered = allActive.data.filter(
    (r) => typeof r.slug === "string" && r.slug.startsWith(FEATURED_SLUG_PREFIX),
  );

  return filtered.map((r) => ({
    id: r.id as string,
    label: r.label as string,
    price_cents: r.price_cents as number,
    duration_days: r.duration_days as number,
    currency: r.currency as string | null,
  }));
}
