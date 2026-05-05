import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function devMethodNotAllowed() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST() {
  return devMethodNotAllowed();
}

function stripeModeFromSecret(k: string): "test" | "live" | "unknown" {
  if (k.startsWith("sk_test_") || k.startsWith("rk_test_")) return "test";
  if (k.startsWith("sk_live_") || k.startsWith("rk_live_")) return "live";
  return "unknown";
}

function stripeModeFromPublishable(k: string): "test" | "live" | "unknown" {
  if (k.startsWith("pk_test_")) return "test";
  if (k.startsWith("pk_live_")) return "live";
  return "unknown";
}

/**
 * Development only: validates Stripe env shape and pings the Stripe API with the secret key.
 * Never returns secret values.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";

  const issues: string[] = [];
  if (!secret) issues.push("STRIPE_SECRET_KEY is missing.");
  if (secret.startsWith("pk_")) {
    issues.push("STRIPE_SECRET_KEY looks like a publishable key (pk_…). Use the secret key (sk_…) from Stripe.");
  }
  if (secret && !secret.startsWith("sk_") && !secret.startsWith("rk_")) {
    issues.push("STRIPE_SECRET_KEY should start with sk_ or rk_.");
  }

  if (!publishable) issues.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing.");
  if (publishable && !publishable.startsWith("pk_")) {
    issues.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with pk_.");
  }

  const secretMode = stripeModeFromSecret(secret);
  const publishableMode = stripeModeFromPublishable(publishable);
  let modesMatch = true;
  if (
    secret &&
    publishable &&
    secretMode !== "unknown" &&
    publishableMode !== "unknown" &&
    secretMode !== publishableMode
  ) {
    modesMatch = false;
    issues.push(
      `Test/live mismatch: secret key is ${secretMode} mode but publishable key is ${publishableMode} mode.`,
    );
  }

  if (!webhookSecret) {
    issues.push(
      "STRIPE_WEBHOOK_SECRET is missing — /api/webhooks/stripe cannot verify events until you add the signing secret from Stripe → Developers → Webhooks.",
    );
  } else if (!webhookSecret.startsWith("whsec_")) {
    issues.push("STRIPE_WEBHOOK_SECRET should start with whsec_ (Webhook signing secret).");
  }

  let stripeApi: { ok: boolean; livemode?: boolean; error?: string } = { ok: false };

  if (
    secret &&
    !secret.startsWith("pk_") &&
    (secret.startsWith("sk_") || secret.startsWith("rk_"))
  ) {
    try {
      const stripe = new Stripe(secret);
      const balance = await stripe.balance.retrieve();
      stripeApi = { ok: true, livemode: balance.livemode };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      stripeApi = {
        ok: false,
        error: msg.includes("Invalid API Key") ? "Stripe rejected this secret key (invalid or revoked)." : msg,
      };
      issues.push("Stripe API call failed — secret key may be wrong or not authorized.");
    }
  }

  const overallOk = issues.length === 0 && stripeApi.ok;

  return NextResponse.json({
    ok: overallOk,
    summary: overallOk
      ? "Stripe keys are configured, webhook signing secret is set, and the secret key works with the Stripe API."
      : "See `issues` — fix env vars and restart the dev server.",
    secretKeyPresent: Boolean(secret),
    publishableKeyPresent: Boolean(publishable),
    secretKeyMode: secretMode,
    publishableKeyMode: publishableMode,
    modesMatch,
    webhookSecretConfigured: Boolean(webhookSecret && webhookSecret.startsWith("whsec_")),
    stripeApi,
    issues,
  });
}
