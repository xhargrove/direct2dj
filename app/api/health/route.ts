import { NextResponse } from "next/server";
import { getStripeModeFromEnv } from "@/lib/billing/stripe-mode";
import { getSiteUrl } from "@/lib/billing/site-url";

/** Liveness + safe runtime labels (no secrets, no DB). */
export async function GET() {
  const siteUrl = getSiteUrl();
  let siteHost = "unknown";
  try {
    siteHost = new URL(siteUrl).host;
  } catch {
    siteHost = siteUrl.replace(/^https?:\/\//, "").split("/")[0] ?? "unknown";
  }

  return NextResponse.json({
    ok: true,
    stripeMode: getStripeModeFromEnv(),
    siteHost,
  });
}
