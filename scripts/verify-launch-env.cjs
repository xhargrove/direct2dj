#!/usr/bin/env node
/**
 * Launch Verification Phase 1 — environment safety audit (no secrets printed).
 * Usage: node scripts/verify-launch-env.cjs [--production]
 *
 * Default: audits .env.local for local dev safety (expects Stripe TEST keys).
 * --production: audit process.env (e.g. CI/Vercel) — expects LIVE keys for real launch.
 */
const fs = require("fs");
const path = require("path");

const productionMode = process.argv.includes("--production");

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return false;
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
  return true;
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

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
}

function isTruthyEnv(v) {
  if (!v) return false;
  const t = String(v).trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}

function allowLiveStripeLocal() {
  return isTruthyEnv(process.env.LAUNCH_ALLOW_LIVE_STRIPE_LOCAL);
}

function isLocalSiteUrl(url) {
  if (!url) return true;
  const u = url.toLowerCase();
  return u.includes("localhost") || u.includes("127.0.0.1") || u.includes("0.0.0.0");
}

async function main() {
  if (!productionMode) {
    const loaded = loadEnvLocal();
    if (!loaded) {
      fail("No .env.local — copy .env.example and configure for local verification.");
      process.exit(1);
    }
    console.log("Launch env audit — LOCAL (.env.local)\n");
  } else {
    console.log("Launch env audit — PRODUCTION (process.env)\n");
  }

  let errors = 0;
  let warnings = 0;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  console.log("Required variables:");
  for (const key of required) {
    const alt =
      key === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
        : null;
    const val = process.env[key]?.trim() || alt;
    if (!val) {
      fail(`${key}: missing`);
      errors += 1;
    } else {
      ok(`${key}: present`);
    }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  console.log("\nSite URL:");
  if (!siteUrl) {
    warn("NEXT_PUBLIC_SITE_URL unset — Stripe redirects may use VERCEL_URL or localhost.");
    warnings += 1;
  } else {
    ok(`NEXT_PUBLIC_SITE_URL=${siteUrl.replace(/\/$/, "")}`);
    if (productionMode && isLocalSiteUrl(siteUrl)) {
      fail("Production audit: NEXT_PUBLIC_SITE_URL must not be localhost.");
      errors += 1;
    }
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const secretMode = modeSecret(secret);
  const pubMode = modePub(pub);

  console.log("\nStripe mode (no secrets shown):");
  ok(`STRIPE_SECRET_KEY mode: ${secretMode}`);
  ok(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY mode: ${pubMode}`);

  if (secretMode !== "missing" && pubMode !== "missing" && secretMode !== pubMode) {
    fail("Stripe test/live mismatch between secret and publishable keys.");
    errors += 1;
  }

  if (!productionMode) {
    if (secretMode === "live") {
      if (allowLiveStripeLocal()) {
        warn(
          "LAUNCH_ALLOW_LIVE_STRIPE_LOCAL is set — live Stripe on localhost allowed (REAL charges possible). Prefer sk_test_… for routine dev.",
        );
        warnings += 1;
      } else {
        fail(
          "LOCAL SAFETY: STRIPE_SECRET_KEY is LIVE — use sk_test_… / pk_test_…, or set LAUNCH_ALLOW_LIVE_STRIPE_LOCAL=1 if intentional.",
        );
        errors += 1;
      }
    } else if (secretMode === "test") {
      ok("Local Stripe keys are test mode — safe for dev smoke (use card 4242…).");
    }
  } else {
    if (secretMode !== "live") {
      warn("Production audit: expected LIVE Stripe keys for public launch billing.");
      warnings += 1;
    } else {
      ok("Production Stripe keys are live mode (intentional for launch).");
    }
  }

  if (secretMode === "live" && isLocalSiteUrl(siteUrl)) {
    if (allowLiveStripeLocal()) {
      warn("Live Stripe + localhost site URL — checkout returns to local Next.js (real charges).");
      warnings += 1;
    } else {
      fail("UNSAFE: Live Stripe keys with localhost — set LAUNCH_ALLOW_LIVE_STRIPE_LOCAL=1 only if intentional.");
      errors += 1;
    }
  }

  console.log("\nCapacitor iOS:");
  try {
    const ios = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "ios/App/App/capacitor.config.json"), "utf8"),
    );
    if (ios.server?.url?.startsWith("https://")) ok(`server.url → ${ios.server.url}`);
    else {
      fail(`Capacitor server.url must be HTTPS (got ${ios.server?.url})`);
      errors += 1;
    }
    if (ios.server?.cleartext === false) ok("cleartext is false");
    else {
      fail("Capacitor cleartext must be false for App Store");
      errors += 1;
    }
  } catch (e) {
    fail(`ios/App/App/capacitor.config.json — ${e.message}`);
    errors += 1;
  }

  console.log("\nStorage / auth assumptions (documented — not probed here):");
  console.log("  • Supabase Storage bucket: promos (private; artist prefix = auth.uid())");
  console.log("  • Auth callback: {SITE_URL}/auth/callback");
  console.log("  • Stripe webhook: {SITE_URL}/api/webhooks/stripe");

  console.log(
    `\n${errors ? `${errors} error(s)` : "No errors"}${warnings ? `, ${warnings} warning(s)` : ""}.\n`,
  );
  console.log("Next: npm run verify:stripe && npm run verify:stripe-webhooks");
  console.log("Docs: docs/LAUNCH_VERIFICATION.md\n");
  process.exit(errors ? 1 : 0);
}

main();
