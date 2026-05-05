import Link from "next/link";
import { notFound } from "next/navigation";
import { djTierLabel } from "@/lib/dj/tier-label";
import type { DjTier } from "@/lib/types/database";
import { DownloadTimelineStrip, fillDailyDownloads, type TimelinePoint } from "@/components/artist/analytics-charts";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

type TrackAnalyticsRow = {
  downloads_total: number;
  ratings_count: number;
  avg_rating: number | null;
  feedback_count: number;
  play_reports_rows: number;
  play_count_sum: number;
  downloads_during_featured: number;
};

type FeaturedTrackRow = {
  placement_id: string;
  label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  moderation_status: string;
  downloads_in_window: number;
};

type SupporterRow = {
  dj_id: string;
  dj_label: string;
  downloaded: boolean;
  rated: boolean;
  dj_tier: string | null;
  city: string | null;
  state: string | null;
};

type FeedbackRow = {
  id: string;
  body: string;
  created_at: string;
  moderation_status: string;
  dj_label: string;
};

function n(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export default async function ArtistTrackAnalyticsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: track, error: trackErr } = await supabase
    .from("tracks")
    .select("id,title")
    .eq("id", id)
    .maybeSingle();

  if (trackErr || !track) {
    notFound();
  }

  const [
    { data: metricsData, error: mErr },
    { data: timelineData, error: tErr },
    { data: featuredData, error: fErr },
    { data: supporterData, error: sErr },
    { data: feedbackData, error: fbErr },
  ] = await Promise.all([
    supabase.rpc("artist_track_analytics", { p_track_id: id }),
    supabase.rpc("artist_track_download_timeline", { p_track_id: id, p_days: 90 }),
    supabase.rpc("artist_track_featured_rows", { p_track_id: id }),
    supabase.rpc("artist_track_supporters", { p_track_id: id, p_limit: 50 }),
    supabase.rpc("artist_track_feedback_list", { p_track_id: id, p_limit: 40 }),
  ]);

  const errs = [mErr, tErr, fErr, sErr, fbErr].filter(Boolean);
  const errMsg = errs.map((e) => e?.message).filter(Boolean).join(" · ");

  const metrics = (Array.isArray(metricsData) ? metricsData[0] : metricsData) as TrackAnalyticsRow | undefined;
  const downloadsTotal = n(metrics?.downloads_total);
  const duringFeatured = n(metrics?.downloads_during_featured);
  const conversionPct =
    downloadsTotal > 0 ? Math.round((1000 * duringFeatured) / downloadsTotal) / 10 : null;

  const timelineRaw = (timelineData ?? []) as TimelinePoint[];
  const timelineFilled = fillDailyDownloads(
    timelineRaw.map((r) => ({
      bucket_date: r.bucket_date,
      download_count: n(r.download_count),
    })),
    90,
  );

  const featured = (featuredData ?? []) as FeaturedTrackRow[];
  const supporters = (supporterData ?? []) as SupporterRow[];
  const feedbackList = (feedbackData ?? []) as FeedbackRow[];

  const avgRating =
    metrics?.avg_rating != null && Number.isFinite(Number(metrics.avg_rating))
      ? Number(metrics.avg_rating).toFixed(2)
      : "—";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/artist/tracks" className="text-zinc-600 underline dark:text-zinc-400">
          ← All tracks
        </Link>
        <Link href={`/artist/tracks/${id}`} className="text-zinc-600 underline dark:text-zinc-400">
          Track detail
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{track.title?.trim() || "Untitled"}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Track analytics — measured activity only.</p>
      </div>

      {errMsg ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950">
          Could not load some sections: {errMsg}. Apply latest Supabase migrations and refresh.
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Snapshot</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{downloadsTotal}</div>
            <div className="text-xs text-zinc-500">Downloads</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{n(metrics?.ratings_count)}</div>
            <div className="text-xs text-zinc-500">Ratings</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{avgRating}</div>
            <div className="text-xs text-zinc-500">Average rating</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{n(metrics?.feedback_count)}</div>
            <div className="text-xs text-zinc-500">Feedback rows</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{n(metrics?.play_count_sum)}</div>
            <div className="text-xs text-zinc-500">Reported plays (sum)</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{n(metrics?.play_reports_rows)}</div>
            <div className="text-xs text-zinc-500">Play report rows</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
        <h2 className="text-lg font-semibold">Featured → download overlap</h2>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          Share of this track&apos;s downloads that occurred while at least one <strong>approved</strong> featured window
          was active for this track (timestamp overlap with download time). This is a factual slice, not modeled
          attribution.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-2xl font-semibold tabular-nums">
              {conversionPct != null ? `${conversionPct}%` : "—"}
            </div>
            <div className="text-xs text-zinc-500">Downloads during featured windows / all downloads</div>
          </div>
          <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-2xl font-semibold tabular-nums">{duringFeatured}</div>
            <div className="text-xs text-zinc-500">Downloads logged during approved featured windows</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Download timeline</h2>
        <div className="mt-4">
          <DownloadTimelineStrip points={timelineFilled} daysLabel="Last 90 days for this track" />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Featured placements</h2>
        {featured.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No featured placements for this track.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {featured.map((row) => (
              <li
                key={row.placement_id}
                className="flex flex-col gap-2 rounded-md border border-zinc-100 p-3 text-sm dark:border-zinc-800 sm:flex-row sm:justify-between"
              >
                <div>
                  <div className="font-medium">{row.label || "Featured"}</div>
                  <div className="mt-1 text-xs text-zinc-500">{row.moderation_status}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {row.starts_at ? new Date(row.starts_at).toLocaleString() : "Start: open"} →{" "}
                    {row.ends_at ? new Date(row.ends_at).toLocaleString() : "End: open"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold tabular-nums">{n(row.downloads_in_window)}</div>
                  <div className="text-xs text-zinc-500">Downloads in window</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">DJs who supported this track</h2>
        <p className="mt-1 text-xs text-zinc-500">
          DJs who downloaded and/or rated. Labels respect privacy; tier and city/state may show when set on the DJ
          profile.
        </p>
        {supporters.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No downloads or ratings yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {supporters.map((row) => (
              <li
                key={row.dj_id}
                className="flex flex-col gap-1 rounded-lg border border-zinc-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <Link href={`/artist/djs/${row.dj_id}`} className="font-medium underline underline-offset-4">
                    {row.dj_label}
                  </Link>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {djTierLabel(row.dj_tier as DjTier | null)}
                    {row.city || row.state
                      ? ` · ${[row.city, row.state].filter(Boolean).join(", ")}`
                      : ""}
                  </div>
                </div>
                <span className="text-xs text-zinc-500 sm:text-right">
                  {[row.downloaded ? "Downloaded" : null, row.rated ? "Rated" : null].filter(Boolean).join(" · ") ||
                    "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Feedback</h2>
        {feedbackList.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No feedback for this track.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {feedbackList.map((f) => (
              <li key={f.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs text-zinc-500">{new Date(f.created_at).toLocaleString()}</span>
                  <span className="text-xs text-zinc-500">{f.moderation_status}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">From {f.dj_label}</div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{f.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="text-xs text-zinc-500 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
        <span>Compare genres and portfolio trends on</span>
        <Link href="/artist/analytics" className="underline underline-offset-4">
          Artist analytics
        </Link>
      </div>
    </div>
  );
}
