import Link from "next/link";
import { redirect } from "next/navigation";
import { djTierLabel } from "@/lib/dj/tier-label";
import { createClient } from "@/lib/supabase/server";
import type { DjVettingStatus } from "@/lib/types/database";

type Props = { searchParams: Promise<{ submitted?: string }> };

function statusMessage(status: DjVettingStatus) {
  switch (status) {
    case "pending":
      return "Your application is pending review. You’ll get promo access once an admin approves you.";
    case "approved":
      return "You’re approved — the Discover feed, downloads, and ratings are available.";
    case "rejected":
      return "Your application wasn’t approved. Update your details and submit again.";
    case "suspended":
      return "Your DJ access is suspended. Contact support if you believe this is a mistake.";
    default:
      return "";
  }
}

export default async function DjApplicationStatusPage({ searchParams }: Props) {
  const sp = await searchParams;
  const submitted = sp.submitted === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dj } = await supabase
    .from("djs")
    .select("vetting_status, dj_tier, display_name")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!dj) redirect("/login");

  const tierLabel = djTierLabel(dj.dj_tier);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Application status</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{statusMessage(dj.vetting_status as DjVettingStatus)}</p>
      </div>

      {submitted ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Application received — thanks.
        </p>
      ) : null}

      <dl className="grid gap-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Status</dt>
          <dd className="font-medium capitalize">{dj.vetting_status}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">DJ tier</dt>
          <dd className="font-medium">{dj.vetting_status === "approved" ? tierLabel : "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Display name</dt>
          <dd className="text-right">{dj.display_name}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 text-sm">
        {dj.vetting_status === "pending" || dj.vetting_status === "rejected" ? (
          <Link
            href="/dj/apply"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {dj.vetting_status === "rejected" ? "Update application" : "Edit application"}
          </Link>
        ) : null}
        {dj.vetting_status === "approved" ? (
          <Link href="/dj/feed" className="text-zinc-700 underline underline-offset-4 dark:text-zinc-300">
            Go to Discover →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
