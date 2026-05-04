import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";

/** Known submission SKUs (matches migrations); used when plan_kind filter returns nothing. */
export const SUBMISSION_PRICING_SLUGS = [
  "submission_single",
  "submission_basic",
  "submission_feedback_reports",
  "submission_pro_email",
  "submission_featured_bundle",
] as const;

export type SubmissionPricingPlanRow = {
  id: string;
  slug: string;
  label: string;
  price_cents: number;
  currency: string | null;
};

function isSubmissionSlug(slug: unknown): slug is string {
  return typeof slug === "string" && (slug.startsWith("submission_") || slug === "submission_single");
}

/**
 * Loads active submission tiers: prefers plan_kind = submission, then known slugs, then slug prefix match.
 * Handles databases where plan_kind column or values are missing/out of sync.
 */
export async function loadSubmissionPricingPlans(
  client: SupabaseClient,
): Promise<SubmissionPricingPlanRow[]> {
  const rpcTry = await client.rpc("list_active_submission_pricing_plans");
  if (!rpcTry.error && Array.isArray(rpcTry.data) && rpcTry.data.length > 0) {
    return rpcTry.data as SubmissionPricingPlanRow[];
  }

  /** Service role bypasses RLS when the RPC is not migrated yet or fails. */
  const db = createServiceRoleClientOrNull() ?? client;

  const sel = "id, slug, label, price_cents, currency, sort_order";

  const byKind = await db
    .from("pricing_plans")
    .select(sel)
    .eq("active", true)
    .eq("plan_kind", "submission")
    .order("sort_order", { ascending: true });

  if (!byKind.error && byKind.data && byKind.data.length > 0) {
    return byKind.data as SubmissionPricingPlanRow[];
  }

  const bySlug = await db
    .from("pricing_plans")
    .select(sel)
    .eq("active", true)
    .in("slug", [...SUBMISSION_PRICING_SLUGS])
    .order("sort_order", { ascending: true });

  if (!bySlug.error && bySlug.data && bySlug.data.length > 0) {
    return bySlug.data as SubmissionPricingPlanRow[];
  }

  const allActive = await db
    .from("pricing_plans")
    .select(sel)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (allActive.error || !allActive.data) {
    return [];
  }

  const filtered = allActive.data.filter((r) => isSubmissionSlug(r.slug));
  return filtered as SubmissionPricingPlanRow[];
}
