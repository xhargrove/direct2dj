import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanCheckoutForms } from "@/components/artist/plan-checkout-form";
import { StripePaymentsNotice } from "@/components/artist/stripe-payments-notice";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ trackId: string }> };

type PlanRow = {
  id: string;
  label: string;
  duration_days: number;
  price_cents: number;
  currency: string;
};

export default async function ArtistPromoteTrackPage({ params }: Props) {
  const { trackId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: artist } = await supabase.from("artists").select("id").eq("profile_id", user.id).maybeSingle();

  if (!artist) {
    notFound();
  }

  const { data: track } = await supabase
    .from("tracks")
    .select("id,title,genre,moderation_status,catalog_active,artist_id")
    .eq("id", trackId)
    .maybeSingle();

  if (
    !track ||
    track.artist_id !== artist.id ||
    track.moderation_status !== "approved" ||
    track.catalog_active !== true
  ) {
    notFound();
  }

  const { data: plans } = await supabase
    .from("pricing_plans")
    .select("id, label, duration_days, price_cents, currency")
    .eq("active", true)
    .eq("plan_kind", "featured")
    .order("sort_order", { ascending: true });

  const planList = (plans ?? []) as PlanRow[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/artist/promote" className="text-zinc-600 underline dark:text-zinc-400">
          ← All eligible tracks
        </Link>
        <Link href={`/artist/tracks/${trackId}`} className="text-zinc-600 underline dark:text-zinc-400">
          Track detail
        </Link>
      </div>

      <StripePaymentsNotice />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{track.title?.trim() || "Untitled"}</h1>
        <p className="mt-1 text-sm text-zinc-500">{track.genre || "—"}</p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a window. After Stripe confirms payment, your placement goes live immediately for the selected duration.
          Unpaid checkouts never activate a feature.
        </p>
      </div>

      {planList.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          No active pricing plans configured. Add rows to <code className="text-xs">pricing_plans</code> in the
          database.
        </p>
      ) : (
        <PlanCheckoutForms trackId={track.id} plans={planList} />
      )}

      <p className="text-xs text-zinc-500">
        Admins can gift placements without payment; those appear as complimentary in admin tools. Your paid runs only
        start after a successful webhook from Stripe.
      </p>
    </div>
  );
}
