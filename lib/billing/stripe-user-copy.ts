/**
 * Copy shown to artists when paid checkout cannot run (missing Stripe env, Checkout errors, etc.).
 * Avoid mentioning env var names or internal configuration details.
 */
export const ARTIST_CHECKOUT_UNAVAILABLE =
  "We couldn’t start checkout right now. Please try again later, or contact support if this keeps happening.";
