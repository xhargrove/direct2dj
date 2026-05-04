import "server-only";

import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type PaymentRow = {
  id: string;
  artist_id: string;
  track_id: string | null;
  pricing_plan_id: string;
  amount_cents: number;
  currency: string;
  status: string;
};

type PlanRow = {
  plan_kind: string;
  duration_days: number;
  label: string;
  active: boolean;
  slug?: string | null;
};

/**
 * After Stripe confirms a submission fee: create draft track, attach payment, mark succeeded.
 * Idempotent when payment already has track_id.
 */
export async function activateSubmissionFromCheckoutSession(
  session: Stripe.Checkout.Session,
  payment: PaymentRow,
  plan: PlanRow,
  options?: { trustPaymentComplete?: boolean },
): Promise<{ ok: true; skipped?: boolean; reason?: string }> {
  if (session.mode !== "payment") {
    return { ok: true, skipped: true, reason: "not_payment_mode" };
  }

  const paid =
    session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!options?.trustPaymentComplete && !paid) {
    return { ok: true, skipped: true, reason: "not_paid" };
  }

  const admin = createServiceRoleClient();

  const submissionLike =
    plan.plan_kind === "submission" ||
    (typeof plan.slug === "string" &&
      (plan.slug.startsWith("submission_") || plan.slug === "submission_single"));

  if (!plan.active || !submissionLike) {
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return { ok: true, skipped: true, reason: "invalid_plan" };
  }

  const amountTotal = session.amount_total;
  if (amountTotal != null && payment.amount_cents !== amountTotal) {
    await admin
      .from("payments")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    return { ok: true, skipped: true, reason: "amount_mismatch" };
  }

  const metaPlan = session.metadata?.pricing_plan_id;
  if (metaPlan && metaPlan !== payment.pricing_plan_id) {
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return { ok: true, skipped: true, reason: "plan_metadata_mismatch" };
  }

  const metaTrack = session.metadata?.track_id;
  if (metaTrack && metaTrack !== payment.track_id) {
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return { ok: true, skipped: true, reason: "track_metadata_mismatch" };
  }

  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (payment.track_id) {
    await admin
      .from("payments")
      .update({
        status: "succeeded",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: pi,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    return { ok: true };
  }

  const { data: inserted, error: insErr } = await admin
    .from("tracks")
    .insert({
      artist_id: payment.artist_id,
      title: "Untitled draft",
      is_draft: true,
      moderation_status: "pending",
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return { ok: true, skipped: true, reason: "track_insert_failed" };
  }

  const { data: updated } = await admin
    .from("payments")
    .update({
      track_id: inserted.id,
      status: "succeeded",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: pi,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .is("track_id", null)
    .select("id")
    .maybeSingle();

  if (!updated) {
    await admin.from("tracks").delete().eq("id", inserted.id);
    return { ok: true, skipped: true, reason: "race_lost" };
  }

  return { ok: true };
}
