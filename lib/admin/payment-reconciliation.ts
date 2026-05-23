import "server-only";

import { activateFeaturedFromCheckoutSession } from "@/lib/billing/activate-featured-checkout";
import { isSubmissionPayment, type SubmissionPaymentForUpload } from "@/lib/billing/submission-upload-links";
import { getStripe } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type Stripe from "stripe";

export type ReconcilePaymentRow = {
  paymentId: string;
  dbStatus: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  sessionId: string | null;
  trackId: string | null;
  planLabel: string;
  artistName: string;
  stripeStatus: Stripe.Checkout.Session["status"] | null;
  stripePaymentStatus: Stripe.Checkout.Session["payment_status"] | null;
  stripePaid: boolean;
  needsActivation: boolean;
  mismatch: boolean;
};

function firstLabel(
  rel: { label: string | null } | { label: string | null }[] | null,
): string {
  if (rel == null) return "—";
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.label?.trim() || "—";
}

function firstArtist(
  rel: { display_name: string | null } | { display_name: string | null }[] | null,
): string {
  if (rel == null) return "—";
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.display_name?.trim() || "—";
}

export async function loadReconcilePaymentRows(limit = 50): Promise<{
  rows: ReconcilePaymentRow[];
  error: string | null;
}> {
  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role not configured.";
    return { rows: [], error: msg };
  }

  const { data: payments, error } = await admin
    .from("payments")
    .select(
      `
      id,
      status,
      amount_cents,
      currency,
      created_at,
      stripe_checkout_session_id,
      track_id,
      pricing_plans ( label, plan_kind, slug ),
      artists ( display_name )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };

  const submissionPayments = (payments ?? []).filter((p) =>
    isSubmissionPayment(p as SubmissionPaymentForUpload),
  );

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe not configured.";
    return { rows: [], error: msg };
  }

  const rows: ReconcilePaymentRow[] = [];

  for (const raw of submissionPayments) {
    const p = raw as {
      id: string;
      status: string;
      amount_cents: number;
      currency: string;
      created_at: string;
      stripe_checkout_session_id: string | null;
      track_id: string | null;
      pricing_plans: { label: string | null } | { label: string | null }[] | null;
      artists: { display_name: string | null } | { display_name: string | null }[] | null;
    };

    const sessionId = p.stripe_checkout_session_id?.trim() || null;
    let stripeStatus: Stripe.Checkout.Session["status"] | null = null;
    let stripePaymentStatus: Stripe.Checkout.Session["payment_status"] | null = null;
    let stripePaid = false;

    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        stripeStatus = session.status;
        stripePaymentStatus = session.payment_status;
        stripePaid =
          session.payment_status === "paid" ||
          session.payment_status === "no_payment_required";
      } catch {
        stripeStatus = null;
        stripePaymentStatus = null;
      }
    }

    const dbSucceeded = p.status === "succeeded";
    const needsActivation =
      stripePaid && (!dbSucceeded || (dbSucceeded && !p.track_id));
    const mismatch = stripePaid && p.status === "pending";

    rows.push({
      paymentId: p.id,
      dbStatus: p.status,
      amountCents: p.amount_cents,
      currency: p.currency,
      createdAt: p.created_at,
      sessionId,
      trackId: p.track_id,
      planLabel: firstLabel(p.pricing_plans),
      artistName: firstArtist(p.artists),
      stripeStatus,
      stripePaymentStatus,
      stripePaid,
      needsActivation,
      mismatch,
    });
  }

  return { rows, error: null };
}

export async function adminActivateCheckoutSession(sessionId: string): Promise<
  | { ok: true; trackId: string | null; skipped?: string }
  | { ok: false; error: string }
> {
  const trimmed = sessionId?.trim();
  if (!trimmed) return { ok: false, error: "Missing session id." };

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    return { ok: false, error: "Stripe is not configured." };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(trimmed);
  } catch {
    return { ok: false, error: "Could not load Stripe checkout session." };
  }

  const paid =
    session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!paid) {
    return { ok: false, error: "Stripe session is not paid yet." };
  }

  try {
    const result = await activateFeaturedFromCheckoutSession(session, {
      trustPaymentComplete: true,
    });
    if (result.skipped && result.reason) {
      console.info("[admin] activate checkout skipped", result.reason, trimmed);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/SUPABASE_SERVICE_ROLE_KEY/i.test(msg)) {
      return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set on the server." };
    }
    console.error("[admin] activate checkout failed", e);
    return { ok: false, error: "Activation failed." };
  }

  const paymentId = session.metadata?.payment_id;
  if (!paymentId || typeof paymentId !== "string") {
    return { ok: true, trackId: null, skipped: "no_payment_metadata" };
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role not configured.";
    return { ok: false, error: msg };
  }

  const { data: payment } = await admin
    .from("payments")
    .select("track_id")
    .eq("id", paymentId)
    .maybeSingle();

  return { ok: true, trackId: payment?.track_id ?? null };
}
