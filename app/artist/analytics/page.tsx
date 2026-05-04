import Link from "next/link";
import { djTierLabel } from "@/lib/dj/tier-label";
import { createClient } from "@/lib/supabase/server";
import type { DjTier } from "@/lib/types/database";
import {
  AnalyticsBar,
  DownloadTimelineStrip,
  fillDailyDownloads,
  type TimelinePoint,
} from "@/components/artist/analytics-charts";

type SummaryRow = {
  total_downloads: number;
  total_ratings: number;
  avg_rating: number | null;
  club_ready_pct: number | null;
  radio_ready_pct: number | null;
};

type DjRow = {
  dj_id: string;
  dj_label: string;
  download_count: number;
  dj_tier: string | null;
  city: string | null;
  state: string | null;
};

type FbRow = {
  id: string;
  body: string;
  created_at: string;
  moderation_status: string;
  track_title: string;
  dj_label: string;
};

type EngagementRow = {
  distinct_supporter_djs: number;
  feedback_comments: number;
};

type GenreRow = {
  genre_key: string;
  download_count: number;
  rating_count: number;
};

type CityRow = {
  city_key: string;
  download_count: number;
};

type PlayRow = {
  report_rows: number;
  play_count_sum: number;
};

type FeaturedRow = {
  placement_id: string;
  track_id: string;
  track_title: string;
  label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  moderation_status: string;
  downloads_in_window: number;
};

function n(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function stat(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return String(v);
}

export default async function ArtistAnalyticsPage() {
  const supabase = await createClient();

  const [
    { data: summaryData, error: sErr },
    { data: djData, error: dErr },
    { data: fbData, error: fErr },
    { data: engagementData, error: eErr },
    { data: timelineData, error: tErr },
    { data: genreData, error: gErr },
    { data: cityData, error: cErr },
    { data: playData, error: pErr },
    { data: featuredData, error: featErr },
  ] = await Promise.all([
    supabase.rpc("artist_analytics_summary"),
    supabase.rpc("artist_most_active_djs", { p_limit: 10 }),
    supabase.rpc("artist_feedback_dashboard", { p_limit: 50 }),
    supabase.rpc("artist_engagement_counts"),
    supabase.rpc("artist_download_timeline", { p_days: 90 }),
    supabase.rpc("artist_genre_stats"),
    supabase.rpc("artist_city_stats", { p_limit: 15 }),
    supabase.rpc("artist_play_stats"),
    supabase.rpc("artist_featured_campaign_stats"),
  ]);

  const summary = (Array.isArray(summaryData) ? summaryData[0] : summaryData) as SummaryRow | undefined;
  const engagement = (Array.isArray(engagementData) ? engagementData[0] : engagementData) as
    | EngagementRow
    | undefined;
  const playRow = (Array.isArray(playData) ? playData[0] : playData) as PlayRow | undefined;

  const topDjs = (djData ?? []) as DjRow[];
  const feedback = (fbData ?? []) as FbRow[];
  const timelineRaw = (timelineData ?? []) as TimelinePoint[];
  const genres = (genreData ?? []) as GenreRow[];
  const cities = (cityData ?? []) as CityRow[];
  const featured = (featuredData ?? []) as FeaturedRow[];

  const timelineFilled = fillDailyDownloads(
    timelineRaw.map((r) => ({
      bucket_date: r.bucket_date,
      download_count: n(r.download_count),
    })),
    90,
  );

  const maxGenreDl = Math.max(1, ...genres.map((r) => n(r.download_count)));
  const maxGenreRt = Math.max(1, ...genres.map((r) => n(r.rating_count)));

  const errs = [sErr, dErr, fErr, eErr, tErr, gErr, cErr, pErr, featErr].filter(Boolean);
  const errMsg = errs.map((e) => e?.message).filter(Boolean).join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Numbers come from logged downloads, ratings, feedback, play reports, and featured placements in your catalog.
          DJ labels follow each DJ&apos;s privacy setting.
        </p>
      </div>

      {errMsg ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950">
          Could not load some analytics: {errMsg}. Apply latest migrations under{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">supabase/migrations</code> and refresh.
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Overview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{n(summary?.total_downloads)}</div>
            <div className="text-xs text-zinc-500">Total DJ downloads</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{n(summary?.total_ratings)}</div>
            <div className="text-xs text-zinc-500">Total DJ ratings</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{stat(summary?.avg_rating ?? null)}</div>
            <div className="text-xs text-zinc-500">Average rating</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{n(engagement?.feedback_comments)}</div>
            <div className="text-xs text-zinc-500">Feedback comments (all tracks)</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">{n(engagement?.distinct_supporter_djs)}</div>
            <div className="text-xs text-zinc-500">Unique DJs (downloaded or rated)</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">
              {summary?.club_ready_pct != null ? `${summary.club_ready_pct}%` : "—"}
            </div>
            <div className="text-xs text-zinc-500">Club ready (of answered)</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl font-semibold tabular-nums">
              {summary?.radio_ready_pct != null ? `${summary.radio_ready_pct}%` : "—"}
            </div>
            <div className="text-xs text-zinc-500">Radio ready (of answered)</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Download timeline</h2>
        <p className="mt-1 text-xs text-zinc-500">Last 90 days, all of your tracks.</p>
        <div className="mt-4">
          <DownloadTimelineStrip points={timelineFilled} daysLabel="Last 90 days (UTC buckets)" />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Genre performance</h2>
        <p className="mt-1 text-xs text-zinc-500">Counts by your track&apos;s genre field (including unspecified).</p>
        {genres.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No genres on file yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {genres.map((row) => (
              <div key={row.genre_key} className="space-y-2">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{row.genre_key}</div>
                <AnalyticsBar label="Downloads" value={n(row.download_count)} max={maxGenreDl} />
                <AnalyticsBar
                  label="Ratings"
                  value={n(row.rating_count)}
                  max={maxGenreRt}
                  barClassName="bg-emerald-700 dark:bg-emerald-400"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Top cities</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Based on DJ profile city when DJs have saved one (see DJ settings). No city means the download isn&apos;t
          counted here — not an estimate.
        </p>
        {cities.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No city-tagged downloads yet. DJs can add an optional city in{" "}
            <Link href="/dj/settings" className="underline underline-offset-4">
              DJ settings
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {cities.map((row) => (
              <AnalyticsBar
                key={row.city_key}
                label={row.city_key}
                value={n(row.download_count)}
                max={Math.max(1, ...cities.map((c) => n(c.download_count)))}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Play reports</h2>
        <p className="mt-1 text-xs text-zinc-500">Totals from DJ-submitted play reports on your catalog.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-zinc-50 p-4 dark:bg-zinc-900/40">
            <div className="text-2xl font-semibold tabular-nums">{n(playRow?.play_count_sum)}</div>
            <div className="text-xs text-zinc-500">Reported plays (sum of play counts)</div>
          </div>
          <div className="rounded-md bg-zinc-50 p-4 dark:bg-zinc-900/40">
            <div className="text-2xl font-semibold tabular-nums">{n(playRow?.report_rows)}</div>
            <div className="text-xs text-zinc-500">Play report rows</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Featured campaign performance</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Downloads-in-window counts only when the placement is approved and the download timestamp falls between
          starts and ends (open-ended dates allowed).
        </p>
        {featured.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No featured placements for your tracks yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {featured.map((row) => (
              <li
                key={row.placement_id}
                className="flex flex-col gap-2 rounded-md border border-zinc-100 p-3 text-sm dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium">{row.track_title}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {row.label || "Featured"} · {row.moderation_status}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {row.starts_at ? new Date(row.starts_at).toLocaleString() : "Start: open"} →{" "}
                    {row.ends_at ? new Date(row.ends_at).toLocaleString() : "End: open"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold tabular-nums">{n(row.downloads_in_window)}</div>
                  <div className="text-xs text-zinc-500">Downloads in window</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Most active DJs</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Ranked by downloads. Tier and location come from the DJ profile when present — not email or phone unless the DJ
          opted into contact sharing.
        </p>
        {topDjs.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No downloads yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {topDjs.map((row) => (
              <li
                key={row.dj_id}
                className="flex flex-col gap-1 rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium">{row.dj_label}</span>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {djTierLabel(row.dj_tier as DjTier | null)}
                    {row.city || row.state
                      ? ` · ${[row.city, row.state].filter(Boolean).join(", ")}`
                      : ""}
                  </div>
                </div>
                <span className="text-zinc-500 sm:text-right">{n(row.download_count)} downloads</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Feedback</h2>
        {feedback.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No feedback yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{f.track_title}</span>
                  <span className="text-xs text-zinc-500">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  From {f.dj_label} · {f.moderation_status}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{f.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        Open per-track analytics from each track.{" "}
        <Link href="/artist/tracks" className="underline underline-offset-4">
          Your tracks
        </Link>
      </p>
    </div>
  );
}
