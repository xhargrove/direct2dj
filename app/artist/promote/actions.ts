"use server";

import { createFeaturedCheckoutSession } from "@/lib/billing/create-featured-checkout-session";

export async function startFeaturedCheckout(trackId: string, pricingPlanId: string) {
  if (!trackId || !pricingPlanId) {
    return { error: "Missing track or plan." } as const;
  }
  const r = await createFeaturedCheckoutSession({ trackId, pricingPlanId });
  if ("error" in r) {
    return { error: r.error } as const;
  }
  return { url: r.url } as const;
}
