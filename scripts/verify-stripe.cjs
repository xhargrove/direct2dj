#!/usr/bin/env node
/**
 * Loads `.env.local` (simple KEY=value parser), validates Stripe-related env shape,
 * and calls Stripe balance.retrieve() — proves STRIPE_SECRET_KEY works.
 * Does not print secret values.
 *
 * Usage: node scripts/verify-stripe.cjs
 */

const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) {
    console.error("No .env.local found at project root.");
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

function modeSecret(k) {
  if (!k) return "missing";
  if (k.startsWith("sk_test_") || k.startsWith("rk_test_")) return "test";
  if (k.startsWith("sk_live_") || k.startsWith("rk_live_")) return "live";
  return "unknown";
}

function modePub(k) {
  if (!k) return "missing";
  if (k.startsWith("pk_test_")) return "test";
  if (k.startsWith("pk_live_")) return "live";
  return "unknown";
}

/** Real Stripe signing secrets are long; placeholders like `whsec_...` break signature verification. */
function webhookSecretLooksInvalid(w) {
  if (!w) return true;
  const t = w.trim();
  if (!t.startsWith("whsec_")) return true;
  if (t === "whsec_..." || t.includes("...")) return true;
  if (t.length < 32) return true;
  return false;
}

function stripeKeyBody(k) {
  const m = k.match(/^(?:sk|pk)_(?:live|test)_(.+)$/);
  return m ? m[1] : "";
}

/** Stripe pairs pk_/sk_ from one account; bodies match for a long prefix then diverge. */
function publishableSecretSameStripePair(skBody, pkBody) {
  if (!skBody || !pkBody) return true;
  let i = 0;
  const max = Math.min(skBody.length, pkBody.length);
  while (i < max && skBody[i] === pkBody[i]) i++;
  return i >= 14;
}

async function main() {
  loadEnvLocal();

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const whsec = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  console.log("Stripe env check (values not shown)\n");

  let ok = true;
  if (!secret) {
    console.log("✗ STRIPE_SECRET_KEY: missing");
    ok = false;
  } else if (secret.startsWith("pk_")) {
    console.log("✗ STRIPE_SECRET_KEY: must be sk_… or rk_… (not pk_)");
    ok = false;
  } else {
    console.log(`✓ STRIPE_SECRET_KEY: present (${modeSecret(secret)} mode)`);
  }

  if (!pub) {
    console.log("✗ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: missing");
    ok = false;
  } else {
    console.log(`✓ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: present (${modePub(pub)} mode)`);
  }

  if (secret && pub && modeSecret(secret) !== "unknown" && modePub(pub) !== "unknown") {
    if (modeSecret(secret) !== modePub(pub)) {
      console.log("✗ Test/live mismatch between secret and publishable keys");
      ok = false;
    } else {
      console.log("✓ Secret and publishable keys are the same mode (test vs live)");
    }
  }

  const bodySk = stripeKeyBody(secret ?? "");
  const bodyPk = stripeKeyBody(pub ?? "");
  if (bodySk && bodyPk && !publishableSecretSameStripePair(bodySk, bodyPk)) {
    console.log("✗ Publishable + secret keys look like different Stripe accounts (prefix mismatch)");
    ok = false;
  } else if (bodySk && bodyPk) {
    console.log("✓ Publishable + secret keys match as a Stripe pair (same account prefix)");
  }

  if (!whsec) {
    console.log("⚠ STRIPE_WEBHOOK_SECRET: missing (webhooks will fail until set)");
    ok = false;
  } else if (!whsec.startsWith("whsec_")) {
    console.log("✗ STRIPE_WEBHOOK_SECRET: expected whsec_…");
    ok = false;
  } else if (webhookSecretLooksInvalid(whsec)) {
    console.log(
      "✗ STRIPE_WEBHOOK_SECRET: looks like a placeholder or truncated value — paste the full signing secret from Stripe → Webhooks → [endpoint] → Reveal",
    );
    ok = false;
  } else {
    console.log("✓ STRIPE_WEBHOOK_SECRET: present (full-length secret)");
  }

  if (!secret || secret.startsWith("pk_")) {
    console.log("\nFix env issues above before calling Stripe.");
    process.exit(ok ? 0 : 1);
  }

  const Stripe = require("stripe");
  try {
    const stripe = new Stripe(secret);
    const balance = await stripe.balance.retrieve();
    console.log(`\n✓ Stripe API: OK (balance.retrieve, livemode=${balance.livemode})`);
  } catch (e) {
    console.log("\n✗ Stripe API:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  console.log(ok ? "\nAll checks passed." : "\nPassed API check; fix warnings above for webhooks.");
  process.exit(ok ? 0 : 1);
}

main();
