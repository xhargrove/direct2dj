import "server-only";

import { ARTIST_CHECKOUT_UNAVAILABLE } from "@/lib/billing/stripe-user-copy";
import { getStripe } from "@/lib/stripe/server";
import { submissionStripeDescription } from "@/lib/billing/submission-tier-copy";
import { getSiteUrl } from "@/lib/billing/site-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export async function createSubmissionCheckoutSession(input: {
  pricingPlanId: string;
}): Promise<{ url: string } | { error: string }> {
  const planId = input.pricingPlanId?.trim();
  if (!planId) {
    return { error: "Choose a submission plan." };
  }

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

  const { data: plan, error: planErr } = await supabase
    .from("pricing_plans")
    .select("id, slug, label, duration_days, price_cents, currency, active, plan_kind")
    .eq("id", planId)
    .eq("active", true)
    .maybeSingle();

  const submissionLike =
    plan &&
    (plan.plan_kind === "submission" ||
      (typeof plan.slug === "string" &&
        (plan.slug.startsWith("submission_") || plan.slug === "submission_single")));

  if (planErr) {
    const msg = planErr.message ?? "";
    if (/plan_kind|column/i.test(msg)) {
      return {
        error:
          "Database is missing submission billing columns. Apply Supabase migrations (e.g. run `supabase db push`).",
      };
    }
    return { error: msg || "Could not load pricing." };
  }

  if (!plan || !submissionLike) {
    return { error: "Invalid or inactive submission plan." };
  }

  const currency = (plan.currency ?? "usd").toLowerCase();

  const { data: payment, error: payInsErr } = await supabase
    .from("payments")
    .insert({
      artist_id: artist.id,
      track_id: null,
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
    console.error("[billing] Stripe client unavailable for submission checkout", e);
    return { error: ARTIST_CHECKOUT_UNAVAILABLE };
  }

  const base = getSiteUrl();
  const description = submissionStripeDescription(plan.slug);

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
              name: plan.label,
              description,
            },
          },
        },
      ],
      success_url: `${base}/artist/tracks/new/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/artist/tracks/new?canceled=1`,
      client_reference_id: payment.id,
      customer_email: user.email ?? undefined,
      metadata: {
        payment_id: payment.id,
        pricing_plan_id: plan.id,
        artist_id: artist.id,
        checkout_kind: "submission",
        submission_slug: plan.slug,
      },
      payment_intent_data: {
        metadata: {
          payment_id: payment.id,
          pricing_plan_id: plan.id,
          checkout_kind: "submission",
          submission_slug: plan.slug,
        },
      },
    });
  } catch (e) {
    console.error("[billing] submission Stripe Checkout session failed", e);
    return { error: ARTIST_CHECKOUT_UNAVAILABLE };
  }

  if (!session.url) {
    console.error("[billing] submission Checkout session missing url");
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
    // Webhook can still resolve by payment_id in metadata.
  }

  return { url: session.url };
}
