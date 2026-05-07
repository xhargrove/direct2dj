import Link from "next/link";
import { TrackStatusBadges } from "@/components/artist/track-status";
import { formatDateDisplay } from "@/lib/format/datetime-display";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/lib/types/database";

type SummaryRow = {
  total_downloads: number;
  total_ratings: number;
  avg_rating: number | null;
};

type EngagementRow = {
  distinct_supporter_djs: number;
  feedback_comments: number;
};

function firstRpcRow<T>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return data as T;
}

function formatAvgRating(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toFixed(1);
}

export default async function ArtistDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let draftCount = 0;
  let pendingCount = 0;
  let recentTracks: Track[] = [];
  let summary: SummaryRow | null = null;
  let engagement: EngagementRow | null = null;

  if (user) {
    const { data: artist } = await supabase.from("artists").select("id").eq("profile_id", user.id).maybeSingle();
    if (artist) {
      const [{ count: d }, { count: p }, tracksResult, summaryRes, engagementRes] = await Promise.all([
        supabase
          .from("tracks")
          .select("*", { count: "exact", head: true })
          .eq("artist_id", artist.id)
          .eq("is_draft", true),
        supabase
          .from("tracks")
          .select("*", { count: "exact", head: true })
          .eq("artist_id", artist.id)
          .eq("is_draft", false)
          .eq("moderation_status", "pending"),
        supabase
          .from("tracks")
          .select("*")
          .eq("artist_id", artist.id)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase.rpc("artist_analytics_summary"),
        supabase.rpc("artist_engagement_counts"),
      ]);

      draftCount = d ?? 0;
      pendingCount = p ?? 0;
      recentTracks = (tracksResult.data ?? []) as Track[];

      if (!summaryRes.error) {
        const row = firstRpcRow<SummaryRow>(summaryRes.data);
        summary = row;
      }
      if (!engagementRes.error) {
        const row = firstRpcRow<EngagementRow>(engagementRes.data);
        engagement = row;
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Artist dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your packs, reach, and ratings at a glance. Buy another upload or featured placement anytime on{" "}
          <Link href="/artist/billing" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Billing
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-2xl font-semibold">{draftCount}</div>
          <div className="text-xs text-zinc-500">Draft packs</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-2xl font-semibold">{pendingCount}</div>
          <div className="text-xs text-zinc-500">Awaiting admin</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-2xl font-semibold">{summary?.total_downloads ?? "—"}</div>
          <div className="text-xs text-zinc-500">Pack downloads</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-2xl font-semibold">{formatAvgRating(summary?.avg_rating)}</div>
          <div className="text-xs text-zinc-500">Avg rating</div>
        </div>
      </div>

      {(summary || engagement) && (
        <dl className="grid gap-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800 sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Total ratings</dt>
            <dd className="font-medium tabular-nums">{summary?.total_ratings ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">DJs engaged</dt>
            <dd className="font-medium tabular-nums">{engagement?.distinct_supporter_djs ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:col-span-2">
            <dt className="text-zinc-500">Feedback comments</dt>
            <dd className="font-medium tabular-nums">{engagement?.feedback_comments ?? "—"}</dd>
          </div>
        </dl>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent packs</h2>
          <Link
            href="/artist/tracks"
            className="text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
          >
            View all tracks
          </Link>
        </div>

        {recentTracks.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 border-dashed px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            No packs yet. When you&apos;re ready for another upload, use{" "}
            <Link href="/artist/billing" className="font-medium underline">
              Billing
            </Link>{" "}
            or{" "}
            <Link href="/artist/tracks/new" className="font-medium underline">
              New pack
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {recentTracks.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/artist/tracks/${t.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {t.title || "Untitled"}
                  </Link>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {t.credit_artist_name || "—"} · {t.genre || "—"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Updated {formatDateDisplay(t.updated_at)}
                  </p>
                  <div className="mt-2">
                    <TrackStatusBadges moderationStatus={t.moderation_status} isDraft={t.is_draft} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1">
                  <Link
                    href={`/artist/tracks/${t.id}/analytics`}
                    className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
                  >
                    Analytics
                  </Link>
                  <Link
                    href={`/artist/tracks/${t.id}/edit`}
                    className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/artist/analytics"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900 sm:flex-none sm:min-w-[12rem]"
        >
          Full analytics
        </Link>
        <Link
          href="/artist/billing"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-600 sm:flex-none sm:min-w-[12rem]"
        >
          Billing &amp; uploads
        </Link>
      </div>
    </div>
  );
}
