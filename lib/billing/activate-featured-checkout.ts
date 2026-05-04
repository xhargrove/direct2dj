import "server-only";

import type Stripe from "stripe";
import { activateSubmissionFromCheckoutSession } from "@/lib/billing/activate-submission-checkout";
import { sweepFeaturedPlacementNotifications } from "@/lib/notifications/events";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * After Stripe confirms payment: create approved featured window + mark payment succeeded.
 * Idempotent per payment id. Does not activate unpaid sessions.
 */
export async function activateFeaturedFromCheckoutSession(
  session: Stripe.Checkout.Session,
  options?: { trustPaymentComplete?: boolean },
): Promise<{
  ok: true;
  skipped?: boolean;
  reason?: string;
}> {
  if (session.mode !== "payment") {
    return { ok: true, skipped: true, reason: "not_payment_mode" };
  }

  const paymentId = session.metadata?.payment_id;
  if (!paymentId || typeof paymentId !== "string") {
    return { ok: true, skipped: true, reason: "no_payment_metadata" };
  }

  const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!options?.trustPaymentComplete && !paid) {
    return { ok: true, skipped: true, reason: "not_paid" };
  }

  const admin = createServiceRoleClient();

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .select("id, artist_id, track_id, pricing_plan_id, amount_cents, currency, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (payErr || !payment) {
    return { ok: true, skipped: true, reason: "payment_not_found" };
  }

  const { data: planKindRow } = await admin
    .from("pricing_plans")
    .select("plan_kind, duration_days, label, active, slug")
    .eq("id", payment.pricing_plan_id)
    .maybeSingle();

  const submissionLike =
    planKindRow?.plan_kind === "submission" ||
    (typeof planKindRow?.slug === "string" &&
      (planKindRow.slug.startsWith("submission_") || planKindRow.slug === "submission_single"));

  if (planKindRow && submissionLike) {
    return activateSubmissionFromCheckoutSession(session, payment, planKindRow, options);
  }

  if (payment.status === "succeeded") {
    return { ok: true, skipped: true, reason: "already_succeeded" };
  }

  const amountTotal = session.amount_total;
  if (amountTotal != null && payment.amount_cents !== amountTotal) {
    await admin
      .from("payments")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    return { ok: true, skipped: true, reason: "amount_mismatch" };
  }

  const metaTrack = session.metadata?.track_id;
  const metaPlan = session.metadata?.pricing_plan_id;
  if (metaTrack && metaTrack !== payment.track_id) {
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", paymentId);
    return { ok: true, skipped: true, reason: "track_metadata_mismatch" };
  }
  if (metaPlan && metaPlan !== payment.pricing_plan_id) {
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", paymentId);
    return { ok: true, skipped: true, reason: "plan_metadata_mismatch" };
  }

  const { data: plan, error: planErr } = await admin
    .from("pricing_plans")
    .select("id, duration_days, label, active, plan_kind")
    .eq("id", payment.pricing_plan_id)
    .maybeSingle();

  if (planErr || !plan || !plan.active || plan.plan_kind !== "featured") {
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", paymentId);
    return { ok: true, skipped: true, reason: "invalid_plan" };
  }

  const { data: track, error: trackErr } = await admin
    .from("tracks")
    .select("id, artist_id, moderation_status, catalog_active")
    .eq("id", payment.track_id)
    .maybeSingle();

  if (
    trackErr ||
    !track ||
    track.artist_id !== payment.artist_id ||
    track.moderation_status !== "approved" ||
    track.catalog_active !== true
  ) {
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", paymentId);
    return { ok: true, skipped: true, reason: "track_not_eligible" };
  }

  const { data: existingFp } = await admin
    .from("featured_placements")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const startsAt = new Date();
  const endsMs = startsAt.getTime() + Number(plan.duration_days) * 86_400_000;
  const endsAt = new Date(endsMs);

  if (!existingFp) {
    const { error: insErr } = await admin.from("featured_placements").insert({
      track_id: track.id,
      label: `Featured · ${plan.duration_days} days (${plan.label})`,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      moderation_status: "approved",
      payment_id: paymentId,
      activation_source: "paid_checkout",
    });
    if (insErr) {
      await admin
        .from("payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", paymentId);
      return { ok: true, skipped: true, reason: "placement_insert_failed" };
    }
  }

  await admin
    .from("payments")
    .update({
      status: "succeeded",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: pi,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  await sweepFeaturedPlacementNotifications();
  return { ok: true };
}

export async function markCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
  const paymentId = session.metadata?.payment_id;
  if (!paymentId || typeof paymentId !== "string") return;

  const admin = createServiceRoleClient();
  const { data: payment } = await admin.from("payments").select("id, status").eq("id", paymentId).maybeSingle();
  if (!payment || payment.status !== "pending") return;

  await admin
    .from("payments")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", paymentId);
}
