"use server";

import { redirect } from "next/navigation";
import { createFeaturedCheckoutSession } from "@/lib/billing/create-featured-checkout-session";

export async function startFeaturedCheckoutForm(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const trackId = formData.get("trackId")?.toString().trim() ?? "";
  const pricingPlanId = formData.get("pricingPlanId")?.toString().trim() ?? "";
  if (!trackId || !pricingPlanId) {
    return { error: "Missing track or plan." };
  }
  const r = await createFeaturedCheckoutSession({ trackId, pricingPlanId });
  if ("error" in r) {
    return { error: r.error };
  }
  redirect(r.url);
}
