import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PlayReportVerification } from "@/lib/types/database";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function verificationLabel(v: PlayReportVerification) {
  if (v === "verified") return "Verified";
  return "Self-reported";
}

export default async function DjPlayReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const submitted = sp.submitted === "1" || sp.submitted === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dj } = await supabase.from("djs").select("id").eq("profile_id", user.id).maybeSingle();
  if (!dj) return <p className="text-sm text-red-600">No DJ profile.</p>;

  const { data: rows } = await supabase
    .from("play_reports")
    .select(
      `
      id,
      played_at,
      venue_name,
      city,
      state,
      event_name,
      estimated_crowd_size,
      crowd_reaction,
      verification_status,
      tracks ( id, title )
    `,
    )
    .eq("dj_id", dj.id)
    .order("played_at", { ascending: false })
    .limit(80);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Play reports</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Plays you’ve reported. Self-reported entries stay that way until an admin verifies them.
          </p>
        </div>
        <Link
          href="/dj/play-reports/new"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New report
        </Link>
      </div>

      {submitted ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
          Play report submitted.
        </p>
      ) : null}

      {!rows || rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No play reports yet.{" "}
          <Link href="/dj/play-reports/new" className="underline underline-offset-4">
            Create one
          </Link>{" "}
          or open a track and choose “Report a play”.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => {
            const t = r.tracks as { id?: string; title?: string } | null;
            const v = r.verification_status as PlayReportVerification;
            return (
              <li
                key={r.id}
                className="border-b border-zinc-200 pb-4 text-sm dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {t?.title ?? "Track"}{" "}
                    {t?.id ? (
                      <Link href={`/dj/tracks/${t.id}`} className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
                        (open)
                      </Link>
                    ) : null}
                  </span>
                  <span
                    className={
                      v === "verified"
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-900 dark:bg-green-950 dark:text-green-200"
                        : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }
                  >
                    {verificationLabel(v)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {r.played_at} · {r.venue_name}
                  {r.city ? ` · ${r.city}` : ""}
                  {r.state ? `, ${r.state}` : ""}
                </div>
                <div className="mt-1 text-zinc-700 dark:text-zinc-300">{r.event_name}</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Crowd: {r.estimated_crowd_size}
                  {r.crowd_reaction ? ` · Reaction: ${r.crowd_reaction.replace("_", " ")}` : ""}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
