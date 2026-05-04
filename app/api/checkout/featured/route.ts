import { NextResponse } from "next/server";
import { createFeaturedCheckoutSession } from "@/lib/billing/create-featured-checkout-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { trackId?: string; pricingPlanId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const trackId = typeof body.trackId === "string" ? body.trackId : "";
  const pricingPlanId = typeof body.pricingPlanId === "string" ? body.pricingPlanId : "";
  if (!trackId || !pricingPlanId) {
    return NextResponse.json({ error: "trackId and pricingPlanId are required." }, { status: 400 });
  }

  const r = await createFeaturedCheckoutSession({ trackId, pricingPlanId });
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: 400 });
  }
  return NextResponse.json({ url: r.url });
}
