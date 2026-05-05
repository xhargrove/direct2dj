import { ARTIST_CHECKOUT_UNAVAILABLE } from "@/lib/billing/stripe-user-copy";
import { hasStripeSecretKeyEnv } from "@/lib/stripe/server";

/** Shown on paid artist flows when Stripe server keys are not configured (e.g. missing on Vercel). */
export async function StripePaymentsNotice() {
  if (hasStripeSecretKeyEnv()) return null;

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="font-medium">Payments not connected</p>
      <p className="mt-1 text-amber-950/90 dark:text-amber-100/90">{ARTIST_CHECKOUT_UNAVAILABLE}</p>
    </div>
  );
}
