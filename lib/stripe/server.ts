import "server-only";
import Stripe from "stripe";

let stripe: Stripe | null = null;

function validateStripeSecretKey(key: string): void {
  const k = key.trim();
  if (k.startsWith("pk_")) {
    throw new Error(
      "STRIPE_SECRET_KEY is set to a publishable key (pk_…). Use the secret key (sk_test_… or sk_live_…) from Stripe → Developers → API keys. Never put the secret in NEXT_PUBLIC_* variables.",
    );
  }
  if (!k.startsWith("sk_") && !k.startsWith("rk_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be a Stripe secret (sk_…) or restricted key (rk_…). Re-copy from Stripe → Developers → API keys.",
    );
  }
}

export function getStripe(): Stripe {
  if (!stripe) {
    const raw = process.env.STRIPE_SECRET_KEY;
    if (!raw?.trim()) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    const key = raw.trim();
    validateStripeSecretKey(key);
    stripe = new Stripe(key);
  }
  return stripe;
}
