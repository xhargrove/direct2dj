import "server-only";

import { normalizePublicSiteUrl } from "@/lib/site-url";

/** Canonical site URL for Stripe redirects (no trailing slash). */
export function getSiteUrl(): string {
  const fromEnv = normalizePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
