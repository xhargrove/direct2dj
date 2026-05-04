import Link from "next/link";

export type BillingSubmissionTier = {
  id: string;
  slug: string;
  label: string;
  price_cents: number;
  currency: string | null;
};

export type BillingFeaturedTier = {
  id: string;
  label: string;
  price_cents: number;
  duration_days: number;
  currency: string | null;
};

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function tierTeaser(slug: string): string {
  switch (slug) {
    case "submission_basic":
      return "Open a new draft and submit your DJ pack for review.";
    case "submission_feedback_reports":
      return "Pack upload plus DJ feedback & play reports.";
    case "submission_pro_email":
      return "Upload, DJ feedback, play reports & email outreach.";
    case "submission_featured_bundle":
      return "Featured Artist bundle with upload, feedback & email.";
    default:
      return "Paid draft upload and promo submission.";
  }
}

export function BillingPromoCards({
  submissionTiers,
  featuredTiers,
}: {
  submissionTiers: BillingSubmissionTier[];
  featuredTiers: BillingFeaturedTier[];
}) {
  const cur = (c: string | null) => (c ?? "usd").toUpperCase();

  const minSubmission =
    submissionTiers.length > 0
      ? submissionTiers.reduce((m, t) => Math.min(m, t.price_cents), Number.POSITIVE_INFINITY)
      : null;

  const minFeatured =
    featuredTiers.length > 0
      ? featuredTiers.reduce((m, t) => Math.min(m, t.price_cents), Number.POSITIVE_INFINITY)
      : null;

  const cheapestFeatured =
    featuredTiers.length > 0
      ? featuredTiers.reduce((a, b) => (a.price_cents <= b.price_cents ? a : b))
      : null;

  const heroFeaturedPrice =
    cheapestFeatured != null && minFeatured !== null && Number.isFinite(minFeatured)
      ? formatMoney(minFeatured, cur(cheapestFeatured.currency))
      : null;

  const heroSubmissionPrice =
    minSubmission !== null && Number.isFinite(minSubmission)
      ? formatMoney(
          minSubmission,
          cur(submissionTiers.find((t) => t.price_cents === minSubmission)?.currency ?? null),
        )
      : null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Promotions &amp; upsells
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Grow visibility with paid uploads and DJ Discover placements — prices pull from your catalog.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900 dark:hover:border-zinc-600">
          <span className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            New release
          </span>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">DJ pack upload</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Start a draft after checkout, attach audio &amp; art, then submit for admin review.
          </p>
          {heroSubmissionPrice ? (
            <p className="mt-4 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              From {heroSubmissionPrice}
            </p>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Pricing unavailable — check pricing_plans in the database.</p>
          )}
          <Link
            href="/artist/tracks/new"
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition group-hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:group-hover:bg-white"
          >
            Choose upload plan
          </Link>
        </article>

        <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-violet-50/90 to-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-zinc-800 dark:from-violet-950/40 dark:to-zinc-900 dark:hover:border-violet-900/60">
          <span className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Discover feed
          </span>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Featured placement</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Pin an approved, catalog-active track to the top of the DJ Discover feed for a fixed window.
          </p>
          {heroFeaturedPrice ? (
            <div className="mt-4">
              <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                From {heroFeaturedPrice}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Longer windows available — choose when you promote an eligible track.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No featured plans configured yet.</p>
          )}
          <Link
            href="/artist/promote"
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-violet-200 bg-white/80 px-4 text-sm font-medium text-violet-900 backdrop-blur transition hover:bg-white dark:border-violet-800 dark:bg-zinc-950/80 dark:text-violet-100 dark:hover:bg-zinc-900"
          >
            Promote a track
          </Link>
        </article>
      </div>

      {submissionTiers.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Upload tiers</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {submissionTiers.map((t) => (
              <li
                key={t.id}
                className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.label}</span>
                <span className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatMoney(t.price_cents, cur(t.currency))}
                </span>
                <p className="mt-2 flex-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                  {tierTeaser(t.slug)}
                </p>
                <Link
                  href="/artist/tracks/new"
                  className="mt-3 text-xs font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
                >
                  Select at checkout →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {featuredTiers.length > 1 ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Featured windows</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {featuredTiers.map((t) => (
              <li key={t.id}>
                <Link
                  href="/artist/promote"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
                >
                  <span>{t.duration_days} days</span>
                  <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                    {formatMoney(t.price_cents, cur(t.currency))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
