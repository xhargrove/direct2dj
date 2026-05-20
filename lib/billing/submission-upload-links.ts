/**
 * Links artists to the upload editor after submission checkout.
 */

export type SubmissionPaymentForUpload = {
  status: string;
  track_id: string | null;
  stripe_checkout_session_id: string | null;
  pricing_plans:
    | { plan_kind: string | null; slug?: string | null }
    | { plan_kind: string | null; slug?: string | null }[]
    | null;
};

function firstPlan(
  rel: SubmissionPaymentForUpload["pricing_plans"],
): { plan_kind: string | null; slug?: string | null } | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export function isSubmissionPayment(payment: SubmissionPaymentForUpload): boolean {
  const pl = firstPlan(payment.pricing_plans);
  if (!pl) return false;
  if (pl.plan_kind === "submission") return true;
  const slug = pl.slug;
  return (
    typeof slug === "string" &&
    (slug.startsWith("submission_") || slug === "submission_single")
  );
}

/** Where the artist should go to upload after paying for a submission tier. */
export function submissionUploadHref(payment: SubmissionPaymentForUpload): string | null {
  if (!isSubmissionPayment(payment)) return null;

  if (payment.track_id) {
    return `/artist/tracks/${payment.track_id}/edit`;
  }

  const sessionId = payment.stripe_checkout_session_id?.trim();
  if (!sessionId) return null;

  if (
    payment.status === "pending" ||
    payment.status === "processing" ||
    payment.status === "succeeded"
  ) {
    return `/artist/tracks/new/complete?session_id=${encodeURIComponent(sessionId)}`;
  }

  return null;
}

export function submissionNeedsUpload(payment: SubmissionPaymentForUpload): boolean {
  const href = submissionUploadHref(payment);
  if (!href) return false;
  if (payment.status === "failed" || payment.status === "canceled") return false;
  return payment.status === "succeeded" || payment.status === "pending" || payment.status === "processing";
}
