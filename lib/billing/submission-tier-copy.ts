import "server-only";

/** Stripe Checkout line-item description by pricing_plans.slug */
export function submissionStripeDescription(slug: string): string {
  switch (slug) {
    case "submission_basic":
      return "New DJ pack draft · upload after checkout.";
    case "submission_feedback_reports":
      return "DJ pack upload · DJ feedback & play reports for this release.";
    case "submission_pro_email":
      return "DJ pack upload · DJ feedback, play reports & artist email outreach.";
    case "submission_featured_bundle":
      return "Featured Artist placement · DJ pack upload, DJ feedback, play reports & email service.";
    default:
      return "New DJ pack draft · upload after checkout.";
  }
}
