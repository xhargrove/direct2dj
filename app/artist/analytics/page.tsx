import Link from "next/link";
import { TrackStatusBadges } from "@/components/artist/track-status";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/lib/types/database";

type TrackMetricsRow = {
  downloads_total: number;
  ratings_count: number;
  avg_rating: number | null;
  feedback_count: number;
  play_reports_rows: number;
  play_count_sum: number;
};

function firstRpcRow<T>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return data as T;
}

function n(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function formatAvgRating(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toFixed(1);
}

export default async function ArtistAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tracks: Track[] = [];
  const metricsByTrackId = new Map<string, TrackMetricsRow>();
  let loadError: string | null = null;

  if (user) {
    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (artist) {
      const { data: trackRows, error: trackErr } = await supabase
        .from("tracks")
        .select("*")
        .eq("artist_id", artist.id)
        .order("updated_at", { ascending: false });

      if (trackErr) {
        loadError = trackErr.message;
      } else {
        tracks = (trackRows ?? []) as Track[];

        const results = await Promise.all(
          tracks.map(async (track) => {
            const { data, error } = await supabase.rpc("artist_track_analytics", { p_track_id: track.id });
            return { trackId: track.id, data, error };
          }),
        );

        const metricErrors = results.map((r) => r.error?.message).filter(Boolean);
        if (metricErrors.length > 0) {
          loadError = [...new Set(metricErrors)].join(" · ");
        }

        for (const result of results) {
          const row = firstRpcRow<TrackMetricsRow>(result.data);
          if (row) {
            metricsByTrackId.set(result.trackId, row);
          }
        }
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Track analytics</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Each pack shows only its own downloads, ratings, feedback, and play reports. Open a track for timelines,
          DJ supporters, and feedback detail.
        </p>
      </div>

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950">
          Could not load some analytics: {loadError}. Apply latest migrations under{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">supabase/migrations</code> and refresh.
        </p>
      ) : null}

      {tracks.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 border-dashed px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          No tracks yet. Upload a pack from{" "}
          <Link href="/artist/tracks/new" className="font-medium underline">
            New pack
          </Link>{" "}
          to see analytics here.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {tracks.map((track) => {
            const metrics = metricsByTrackId.get(track.id);
            return (
              <li
                key={track.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/artist/tracks/${track.id}/analytics`}
                      className="text-lg font-semibold text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
                    >
                      {track.title?.trim() || "Untitled"}
                    </Link>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {track.credit_artist_name || "—"} · {track.genre || "—"}
                    </p>
                    <div className="mt-2">
                      <TrackStatusBadges moderationStatus={track.moderation_status} isDraft={track.is_draft} />
                    </div>
                  </div>
                  <Link
                    href={`/artist/tracks/${track.id}/analytics`}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-600"
                  >
                    Full report →
                  </Link>
                </div>

                {track.is_draft ? (
                  <p className="mt-4 text-sm text-zinc-500">
                    Draft packs have no DJ activity yet. Finish upload and submit for review to start collecting data.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900/40">
                      <div className="text-xl font-semibold tabular-nums">{n(metrics?.downloads_total)}</div>
                      <div className="text-xs text-zinc-500">Downloads</div>
                    </div>
                    <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900/40">
                      <div className="text-xl font-semibold tabular-nums">{n(metrics?.ratings_count)}</div>
                      <div className="text-xs text-zinc-500">Ratings</div>
                    </div>
                    <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900/40">
                      <div className="text-xl font-semibold tabular-nums">
                        {formatAvgRating(metrics?.avg_rating ?? null)}
                      </div>
                      <div className="text-xs text-zinc-500">Average rating</div>
                    </div>
                    <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900/40">
                      <div className="text-xl font-semibold tabular-nums">{n(metrics?.feedback_count)}</div>
                      <div className="text-xs text-zinc-500">Feedback</div>
                    </div>
                    <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900/40">
                      <div className="text-xl font-semibold tabular-nums">{n(metrics?.play_count_sum)}</div>
                      <div className="text-xs text-zinc-500">Reported plays</div>
                    </div>
                    <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900/40">
                      <div className="text-xl font-semibold tabular-nums">{n(metrics?.play_reports_rows)}</div>
                      <div className="text-xs text-zinc-500">Play report rows</div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
