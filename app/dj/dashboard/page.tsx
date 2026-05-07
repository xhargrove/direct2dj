import Link from "next/link";
import { DjCrewRoster } from "@/components/dj/dj-crew-roster";
import { createClient } from "@/lib/supabase/server";

export default async function DjDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let downloadCount = 0;
  let playCount = 0;
  let djId: string | null = null;
  let approved = false;

  if (user) {
    const { data: dj } = await supabase.from("djs").select("id, vetting_status").eq("profile_id", user.id).maybeSingle();
    djId = dj?.id ?? null;
    approved = dj?.vetting_status === "approved";
    if (djId && approved) {
      const { count: dc } = await supabase
        .from("downloads")
        .select("*", { count: "exact", head: true })
        .eq("dj_id", djId);
      const { data: plays } = await supabase.from("play_reports").select("play_count").eq("dj_id", djId);
      downloadCount = dc ?? 0;
      playCount = (plays ?? []).reduce((s, r) => s + r.play_count, 0);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {approved ? (
            <>
              Discover approved promos, download packs, and log plays for your sets.
            </>
          ) : (
            <>
              Submit your DJ application and wait for admin approval before the Discover feed, downloads, play reports,
              and ratings unlock.
            </>
          )}
        </p>
      </div>

      {approved ? (
        <>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="text-2xl font-semibold">{downloadCount}</div>
              <div className="text-xs text-zinc-500">Pack downloads</div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="text-2xl font-semibold">{playCount}</div>
              <div className="text-xs text-zinc-500">Reported plays</div>
            </div>
          </div>

          {djId ? <DjCrewRoster djId={djId} /> : null}

          <div className="flex flex-col gap-3">
            <Link
              href="/dj/feed"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Open discovery feed
            </Link>
            <Link
              href="/dj/downloads"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-600"
            >
              Downloads
            </Link>
            <Link
              href="/dj/history"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-600"
            >
              Activity history
            </Link>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">Promo access requires approval</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Finish the DJ application with every required field. After you submit it, our team reviews your profile. You
            will use this dashboard for stats and shortcuts once you are approved.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/dj/apply"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Open DJ application
            </Link>
            <Link
              href="/dj/application-status"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-600"
            >
              Application status
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
