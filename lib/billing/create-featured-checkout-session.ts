import "server-only";

import { ARTIST_CHECKOUT_UNAVAILABLE } from "@/lib/billing/stripe-user-copy";
import { getStripe } from "@/lib/stripe/server";
import { getSiteUrl } from "@/lib/billing/site-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export async function createFeaturedCheckoutSession(input: {
  trackId: string;
  pricingPlanId: string;
}): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!artist) return { error: "Artist profile not found." };

  const { data: track } = await supabase
    .from("tracks")
    .select("id, artist_id, moderation_status, catalog_active")
    .eq("id", input.trackId)
    .maybeSingle();

  if (
    !track ||
    track.artist_id !== artist.id ||
    track.moderation_status !== "approved" ||
    track.catalog_active !== true
  ) {
    return { error: "Only approved, catalog-active tracks can be featured." };
  }

  const { data: plan } = await supabase
    .from("pricing_plans")
    .select("id, slug, label, duration_days, price_cents, currency, active, plan_kind")
    .eq("id", input.pricingPlanId)
    .eq("plan_kind", "featured")
    .maybeSingle();

  if (!plan || !plan.active) return { error: "Invalid or inactive pricing plan." };

  const currency = (plan.currency ?? "usd").toLowerCase();

  const { data: payment, error: payInsErr } = await supabase
    .from("payments")
    .insert({
      artist_id: artist.id,
      track_id: track.id,
      pricing_plan_id: plan.id,
      amount_cents: plan.price_cents,
      currency,
      status: "pending",
    })
    .select("id")
    .single();

  if (payInsErr || !payment) {
    return { error: payInsErr?.message ?? "Could not start checkout." };
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (e) {
    console.error("[billing] Stripe client unavailable for featured checkout", e);
    return { error: ARTIST_CHECKOUT_UNAVAILABLE };
  }

  const base = getSiteUrl();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: plan.price_cents,
          product_data: {
            name: `${plan.label}`,
            description: `DJ feed feature · ${plan.duration_days} days`,
          },
        },
      },
    ],
    success_url: `${base}/artist/billing?checkout=success`,
    cancel_url: `${base}/artist/promote/${track.id}?canceled=1`,
    client_reference_id: payment.id,
    customer_email: user.email ?? undefined,
    metadata: {
      payment_id: payment.id,
      track_id: track.id,
      pricing_plan_id: plan.id,
      artist_id: artist.id,
    },
    payment_intent_data: {
      metadata: {
        payment_id: payment.id,
        track_id: track.id,
        pricing_plan_id: plan.id,
      },
    },
  });
  } catch (e) {
    console.error("[billing] featured Stripe Checkout session failed", e);
    return { error: ARTIST_CHECKOUT_UNAVAILABLE };
  }

  if (!session.url) {
    console.error("[billing] featured Checkout session missing url");
    return { error: ARTIST_CHECKOUT_UNAVAILABLE };
  }

  try {
    const admin = createServiceRoleClient();
    await admin
      .from("payments")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
  } catch {
    // Checkout metadata still contains payment_id for webhooks if this update fails.
  }

  return { url: session.url };
}
