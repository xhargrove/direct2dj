import "server-only";

import { activateFeaturedFromCheckoutSession } from "@/lib/billing/activate-featured-checkout";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStripe } from "@/lib/stripe/server";

export type FinalizeSubmissionResult =
  | { ok: true; trackId: string }
  | { ok: false; pending: true }
  | { ok: false; error: string };

/**
 * Return URL after Stripe: ensures submission checkout is fulfilled (same logic as webhook).
 */
export async function finalizeSubmissionCheckout(sessionId: string): Promise<FinalizeSubmissionResult> {
  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    return { ok: false, error: "stripe_not_configured" };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { ok: false, error: "invalid_session" };
  }

  await activateFeaturedFromCheckoutSession(session, { trustPaymentComplete: true });

  const paymentId = session.metadata?.payment_id;
  if (!paymentId || typeof paymentId !== "string") {
    return { ok: false, error: "missing_payment_metadata" };
  }

  const admin = createServiceRoleClient();
  let { data: payment } = await admin
    .from("payments")
    .select("track_id, status, pricing_plan_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) {
    return { ok: false, error: "payment_not_found" };
  }

  /** Rare race with webhook / first activation tick — second pass is idempotent. */
  if (!payment.track_id) {
    await activateFeaturedFromCheckoutSession(session, { trustPaymentComplete: true });
    const { data: paymentAgain } = await admin
      .from("payments")
      .select("track_id, status, pricing_plan_id")
      .eq("id", paymentId)
      .maybeSingle();
    if (paymentAgain) payment = paymentAgain;
  }

  const { data: plan } = await admin
    .from("pricing_plans")
    .select("plan_kind, slug")
    .eq("id", payment.pricing_plan_id)
    .maybeSingle();

  const submissionLike =
    plan?.plan_kind === "submission" ||
    (typeof plan?.slug === "string" &&
      (plan.slug.startsWith("submission_") || plan.slug === "submission_single"));

  if (!submissionLike) {
    return { ok: false, error: "not_submission_checkout" };
  }

  if (payment.track_id) {
    return { ok: true, trackId: payment.track_id };
  }

  if (payment.status === "pending" || payment.status === "processing") {
    return { ok: false, pending: true };
  }

  return { ok: false, error: "payment_not_fulfilled" };
}
