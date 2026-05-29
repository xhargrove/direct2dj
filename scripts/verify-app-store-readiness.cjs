#!/usr/bin/env node
/**
 * Pre-flight checks for App Store + production web.
 * Usage: node scripts/verify-app-store-readiness.cjs [siteUrl]
 */
const fs = require("fs");
const path = require("path");

const siteUrl = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "https://digitalservicepack.com").replace(
  /\/$/,
  "",
);

const root = path.join(__dirname, "..");
let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

async function main() {
  console.log(`App Store readiness — ${siteUrl}\n`);

  // Capacitor iOS config
  console.log("Capacitor:");
  try {
    const ios = readJson("ios/App/App/capacitor.config.json");
    if (ios.server?.url === siteUrl) ok(`ios capacitor.config.json → ${ios.server.url}`);
    else fail(`ios server.url is "${ios.server?.url}" (expected ${siteUrl}). Run: npm run cap:sync:prod`);

    if (ios.server?.cleartext === false) ok("cleartext is false");
    else fail(`cleartext must be false (got ${ios.server?.cleartext})`);
  } catch (e) {
    fail(`ios/App/App/capacitor.config.json — ${e.message}`);
  }

  const capTs = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
  if (capTs.includes('PRODUCTION_SITE_URL = "https://digitalservicepack.com"')) {
    ok("capacitor.config.ts production URL constant");
  } else {
    fail("capacitor.config.ts missing production URL constant");
  }

  // Production health
  console.log("\nProduction web:");
  try {
    const res = await fetch(`${siteUrl}/api/health`, { redirect: "follow" });
    const text = await res.text();
    if (res.ok && text.includes('"ok"')) {
      ok(`/api/health → ${res.status}`);
      if (text.includes('"stripeMode"')) ok(`/api/health exposes stripeMode (no secrets)`);
      else warn(`/api/health missing stripeMode — deploy latest main for launch env visibility`);
    } else fail(`/api/health → ${res.status} ${text.slice(0, 80)}`);
  } catch (e) {
    fail(`/api/health fetch failed — ${e.message}`);
  }

  try {
    const res = await fetch(`${siteUrl}/login`, { redirect: "follow" });
    if (res.ok) ok(`/login → ${res.status}`);
    else fail(`/login → ${res.status}`);
  } catch (e) {
    fail(`/login fetch failed — ${e.message}`);
  }

  try {
    const res = await fetch(`${siteUrl}/privacy`, { redirect: "follow" });
    if (res.ok) ok(`/privacy → ${res.status}`);
    else fail(`/privacy → ${res.status}`);
  } catch (e) {
    fail(`/privacy fetch failed — ${e.message}`);
  }

  console.log(failed ? `\n${failed} check(s) failed.\n` : "\nAll checks passed.\n");
  process.exit(failed ? 1 : 0);
}

main();
