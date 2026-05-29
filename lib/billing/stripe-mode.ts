import "server-only";

export type StripeKeyMode = "test" | "live" | "unknown" | "missing";

/** Infer Stripe mode from server secret key prefix — never logs or returns the key. */
export function stripeModeFromSecretKey(secret: string | undefined | null): StripeKeyMode {
  const k = secret?.trim() ?? "";
  if (!k) return "missing";
  if (k.startsWith("sk_test_") || k.startsWith("rk_test_")) return "test";
  if (k.startsWith("sk_live_") || k.startsWith("rk_live_")) return "live";
  return "unknown";
}

export function stripeModeFromPublishableKey(pub: string | undefined | null): StripeKeyMode {
  const k = pub?.trim() ?? "";
  if (!k) return "missing";
  if (k.startsWith("pk_test_")) return "test";
  if (k.startsWith("pk_live_")) return "live";
  return "unknown";
}

/** Current server Stripe mode from env (no secrets in return value). */
export function getStripeModeFromEnv(): StripeKeyMode {
  return stripeModeFromSecretKey(process.env.STRIPE_SECRET_KEY);
}

export function isStripeLiveMode(): boolean {
  return getStripeModeFromEnv() === "live";
}

/** Keys must be same mode and both present for checkout. */
export function stripeEnvModeMismatch(): boolean {
  const secret = stripeModeFromSecretKey(process.env.STRIPE_SECRET_KEY);
  const pub = stripeModeFromPublishableKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  if (secret === "missing" || pub === "missing") return false;
  if (secret === "unknown" || pub === "unknown") return false;
  return secret !== pub;
}
