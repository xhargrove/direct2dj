import Link from "next/link";
import { SubmissionCheckout, type SubmissionTierOption } from "@/components/artist/submission-checkout";
import { loadSubmissionPricingPlans } from "@/lib/billing/load-submission-pricing-plans";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ canceled?: string }> };

export default async function NewTrackPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();

  const tierRows = await loadSubmissionPricingPlans(supabase);
  const tiers = tierRows as SubmissionTierOption[];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New DJ pack</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Choose a plan, pay once on Stripe, then add metadata and files and submit for admin review. Tracks always
          start as pending — you cannot publish directly.
        </p>
      </div>
      {sp.canceled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Checkout was canceled. You have not been charged.
        </p>
      ) : null}
      <SubmissionCheckout tiers={tiers} />
      <p className="text-center text-sm">
        <Link href="/artist/tracks" className="underline">
          Back to tracks
        </Link>
      </p>
    </div>
  );
}
