import Link from "next/link";
import { SubmissionCheckout, type SubmissionTierOption } from "@/components/artist/submission-checkout";
import { loadSubmissionPricingPlans } from "@/lib/billing/load-submission-pricing-plans";
import { createClient } from "@/lib/supabase/server";

export default async function ArtistDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let draftCount = 0;
  let pendingCount = 0;

  const tierRows = await loadSubmissionPricingPlans(supabase);
  const tiers = tierRows as SubmissionTierOption[];

  if (user) {
    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (artist) {
      const { count: d } = await supabase
        .from("tracks")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", artist.id)
        .eq("is_draft", true);
      const { count: p } = await supabase
        .from("tracks")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", artist.id)
        .eq("is_draft", false)
        .eq("moderation_status", "pending");
      draftCount = d ?? 0;
      pendingCount = p ?? 0;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Artist dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Upload DJ packs for promo pool distribution. Tracks stay private until an admin approves them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-2xl font-semibold">{draftCount}</div>
          <div className="text-xs text-zinc-500">Draft packs</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-2xl font-semibold">{pendingCount}</div>
          <div className="text-xs text-zinc-500">Awaiting admin</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">New DJ pack</h2>
        <SubmissionCheckout tiers={tiers} />
        <Link
          href="/artist/tracks"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700"
        >
          View all tracks
        </Link>
      </div>
    </div>
  );
}
