#!/usr/bin/env node
/**
 * Lists Stripe webhook endpoints for the same mode as STRIPE_SECRET_KEY.
 * Checks for an endpoint whose URL matches NEXT_PUBLIC_SITE_URL + /api/webhooks/stripe.
 */

const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) {
    console.error("No .env.local found.");
    process.exit(1);
  }
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function normalizeBase(u) {
  return u.replace(/\/+$/, "").toLowerCase();
}

function endpointMatches(expectedBase, webhookUrl) {
  const pathSuffix = "/api/webhooks/stripe";
  const w = webhookUrl.replace(/\/+$/, "").toLowerCase();
  const e = normalizeBase(expectedBase) + pathSuffix;
  return w === e;
}

function isLocalBaseUrl(base) {
  if (!base) return false;
  try {
    const h = new URL(base).hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local");
  } catch {
    return false;
  }
}

async function main() {
  loadEnvLocal();
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const whsec = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.error("STRIPE_SECRET_KEY missing.");
    process.exit(1);
  }

  const keyKind = secret.startsWith("rk_")
    ? "restricted (rk_…)"
    : secret.startsWith("sk_")
      ? "standard secret (sk_…)"
      : "unknown format";

  console.log(`STRIPE_SECRET_KEY type: ${keyKind}`);
  if (secret.startsWith("rk_")) {
    console.log(
      "  Restricted keys only return webhook endpoints if the key has read access to “Webhook endpoints” in Dashboard → Developers → API keys → [this key].\n",
    );
  }

  const Stripe = require("stripe");
  const stripe = new Stripe(secret);

  console.log("Webhook signing secret in .env.local:");
  console.log(whsec ? `  present (${whsec.slice(0, 8)}…)` : "  MISSING — add STRIPE_WEBHOOK_SECRET from Dashboard → Webhooks → Signing secret");
  console.log("");
  console.log("Expected app route (from code): POST …/api/webhooks/stripe");
  if (siteUrl) {
    console.log(`Expected production URL (from NEXT_PUBLIC_SITE_URL): ${normalizeBase(siteUrl)}/api/webhooks/stripe`);
  } else {
    console.log("NEXT_PUBLIC_SITE_URL not set — Checkout redirects may be wrong; set canonical site URL.");
  }
  console.log("");
  console.log("Endpoints registered in Stripe (this API key’s mode):\n");

  const { data: endpoints } = await stripe.webhookEndpoints.list({ limit: 100 });

  if (!endpoints.length) {
    console.log("  (none — Stripe returned zero webhook endpoints for this API key)");
    console.log("\nHow to fix:");
    console.log(
      "  1) In Stripe Dashboard (same mode as this key: test vs live) → Developers → Webhooks — do you see any endpoint?",
    );
    console.log("     • If NO: Add endpoint → URL = https://YOUR-DOMAIN/api/webhooks/stripe → select checkout.session.* events → Save → Reveal signing secret → put in STRIPE_WEBHOOK_SECRET.");
    console.log(
      "     • If YES but this script still shows (none): your STRIPE_SECRET_KEY is likely restricted — open Developers → API keys, edit the key, enable read on “Webhook endpoints”, or put a standard sk_live_… / sk_test_… in .env.local for this check (server-only, never commit).",
    );
    console.log(
      "\n  2) NEXT_PUBLIC_SITE_URL is only for matching in this script. For production, set it to https://your real domain (not localhost) on the host where the app runs.",
    );
    console.log(
      "\n  3) STRIPE_WEBHOOK_SECRET must be the “Signing secret” from the Webhook endpoint whose URL matches where Stripe sends events (your deployed https://…/api/webhooks/stripe).",
    );
    process.exit(1);
  }

  let matched = false;
  for (const ep of endpoints) {
    const checkoutHits = (ep.enabled_events || []).filter(
      (ev) =>
        ev === "checkout.session.completed" ||
        ev === "checkout.session.async_payment_succeeded" ||
        ev === "checkout.session.expired" ||
        ev === "*" ||
        ev.startsWith("checkout.session"),
    );
    console.log(`• ${ep.url}`);
    console.log(`  status=${ep.status}`);
    if (checkoutHits.length) {
      console.log(`  includes: ${[...new Set(checkoutHits)].join(", ")}`);
    } else {
      console.log("  warning: no checkout.session.* events — add checkout.session.completed at minimum");
    }

    if (siteUrl && endpointMatches(siteUrl, ep.url)) {
      matched = true;
      console.log("  → matches NEXT_PUBLIC_SITE_URL + /api/webhooks/stripe");
    }
  }

  const hasHttpsWebhook = endpoints.some(
    (ep) =>
      ep.url?.startsWith("https://") &&
      ep.url.replace(/\/+$/, "").toLowerCase().endsWith("/api/webhooks/stripe"),
  );

  console.log("");
  if (siteUrl && matched) {
    console.log("✓ An endpoint URL matches your NEXT_PUBLIC_SITE_URL webhook path.");
    console.log("");
    console.log(
      "Signing secret: Stripe only shows the full whsec_ once per endpoint. Your STRIPE_WEBHOOK_SECRET must be copied from **this same endpoint** in the Dashboard (Reveal → copy). If webhooks return 400 Invalid signature, the secret and endpoint don’t pair.",
    );
  } else if (siteUrl && !matched && isLocalBaseUrl(siteUrl) && hasHttpsWebhook) {
    console.log(
      "✓ A production HTTPS webhook endpoint is registered (NEXT_PUBLIC_SITE_URL is localhost — URL equality check skipped).",
    );
    console.log(
      "  For deployed Checkout redirects, set NEXT_PUBLIC_SITE_URL=https://your-domain on Vercel (keep localhost here only if you want local success URLs).",
    );
  } else if (siteUrl && !matched) {
    console.log("✗ No endpoint URL matches NEXT_PUBLIC_SITE_URL + /api/webhooks/stripe");
    console.log(`  Fix: add endpoint ${normalizeBase(siteUrl)}/api/webhooks/stripe or correct NEXT_PUBLIC_SITE_URL.`);
    process.exit(1);
  } else {
    console.log("Set NEXT_PUBLIC_SITE_URL to verify URL match automatically.");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
