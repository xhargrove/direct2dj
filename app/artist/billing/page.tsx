import Link from "next/link";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import {
  BillingPromoCards,
  type BillingFeaturedTier,
  type BillingSubmissionTier,
} from "@/components/artist/billing-promo-cards";
import { StripePaymentsNotice } from "@/components/artist/stripe-payments-notice";
import { loadFeaturedPricingPlans } from "@/lib/billing/load-featured-pricing-plans";
import { loadSubmissionPricingPlans } from "@/lib/billing/load-submission-pricing-plans";
import {
  submissionNeedsUpload,
  submissionUploadHref,
  type SubmissionPaymentForUpload,
} from "@/lib/billing/submission-upload-links";
import { createClient } from "@/lib/supabase/server";

type PaymentRow = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  track_id: string | null;
  stripe_checkout_session_id: string | null;
  tracks: { title: string | null } | { title: string | null }[] | null;
  pricing_plans:
    | {
        label: string | null;
        duration_days: number | null;
        plan_kind: string | null;
        slug?: string | null;
      }
    | {
        label: string | null;
        duration_days: number | null;
        plan_kind: string | null;
        slug?: string | null;
      }[]
    | null;
};

function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

type Props = { searchParams: Promise<{ checkout?: string }> };

export default async function ArtistBillingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const checkoutOk = sp.checkout === "success";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rows: PaymentRow[] = [];
  let submissionTiers: BillingSubmissionTier[] = [];
  let featuredTiers: BillingFeaturedTier[] = [];

  if (user) {
    const [subPlans, featPlans] = await Promise.all([
      loadSubmissionPricingPlans(supabase),
      loadFeaturedPricingPlans(supabase),
    ]);

    submissionTiers = subPlans as BillingSubmissionTier[];
    featuredTiers = featPlans as BillingFeaturedTier[];

    const { data: artist } = await supabase.from("artists").select("id").eq("profile_id", user.id).maybeSingle();

    if (artist) {
      const { data: payments } = await supabase
        .from("payments")
        .select(
          `
          id,
          status,
          amount_cents,
          currency,
          created_at,
          track_id,
          stripe_checkout_session_id,
          tracks ( title ),
          pricing_plans ( label, duration_days, plan_kind, slug )
        `,
        )
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false })
        .limit(100);

      rows = (payments ?? []) as PaymentRow[];
    }
  }

  const uploadRecovery = rows
    .filter((r) => submissionNeedsUpload(r as SubmissionPaymentForUpload))
    .map((r) => ({
      id: r.id,
      href: submissionUploadHref(r as SubmissionPaymentForUpload),
      hasTrack: Boolean(r.track_id),
    }))
    .find((x) => x.href != null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Payments for DJ pack uploads and Discover featured placements. Activity syncs from Stripe after checkout.
        </p>
      </div>

      <StripePaymentsNotice />

      <BillingPromoCards submissionTiers={submissionTiers} featuredTiers={featuredTiers} />

      {uploadRecovery?.href ? (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-4 dark:border-cyan-900/60 dark:bg-cyan-950/40">
          <p className="font-medium text-cyan-950 dark:text-cyan-100">
            {uploadRecovery.hasTrack ? "Your paid upload is ready" : "Finish setting up your upload"}
          </p>
          <p className="mt-1 text-sm text-cyan-900/90 dark:text-cyan-200/90">
            Add your track details and upload your DJ pack files (audio, artwork, and metadata).
          </p>
          <Link
            href={uploadRecovery.href}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Continue upload →
          </Link>
        </div>
      ) : checkoutOk ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Thanks — when Stripe confirms payment, your purchase activates automatically (usually within seconds).
        </p>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Payment history
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No payments yet. Start an{" "}
            <Link href="/artist/tracks/new" className="underline underline-offset-4">
              upload
            </Link>{" "}
            or{" "}
            <Link href="/artist/promote" className="underline underline-offset-4">
              promote a track
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {rows.map((r) => {
              const tr = firstRel(r.tracks);
              const pl = firstRel(r.pricing_plans);
              const isSubmission = pl?.plan_kind === "submission";
              const uploadHref = submissionUploadHref(r as SubmissionPaymentForUpload);
              const detail =
                isSubmission || !pl?.duration_days
                  ? pl?.label ?? "Plan"
                  : `${pl?.label ?? "Plan"} · ${pl.duration_days} days`;
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{tr?.title?.trim() || "Payment"}</span>
                    <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatMoney(r.amount_cents, r.currency)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {detail} · Status:{" "}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {formatDateTimeDisplay(r.created_at)}
                    {r.stripe_checkout_session_id ? ` · ${r.stripe_checkout_session_id.slice(0, 12)}…` : ""}
                  </div>
                  {uploadHref ? (
                    <Link
                      href={uploadHref}
                      className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
                    >
                      {r.track_id ? "Continue upload →" : "Set up upload →"}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Questions about charges appear here as reported by Stripe. Failed payments do not activate uploads or featured
        windows.
      </p>
    </div>
  );
}
