import Link from "next/link";
import { AdminDeleteTrackButton } from "@/components/admin/admin-delete-track-button";
import { primaryReleaseArtistLabel, workspaceArtistNote } from "@/lib/admin/track-artist-labels";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  title: string;
  moderation_status: string;
  is_draft: boolean;
  catalog_active: boolean;
  created_at: string;
  credit_artist_name: string;
  artists: { display_name: string } | null;
};

type RollupRow = {
  track_id: string;
  downloads_total: number | null;
  ratings_count: number | null;
  avg_rating: number | null;
  feedback_count: number | null;
  play_reports_rows: number | null;
  play_count_sum: number | null;
  downloads_during_featured: number | null;
};

export default async function AdminTracksPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      moderation_status,
      is_draft,
      catalog_active,
      created_at,
      credit_artist_name,
      artists ( display_name )
    `,
    )
    .order("updated_at", { ascending: false });

  const { data: rollupData, error: rollupErr } = await supabase.rpc("admin_tracks_engagement_rollups");

  if (error) {
    return <div className="text-sm text-red-600">Could not load tracks: {error.message}</div>;
  }

  const list = (rows ?? []) as unknown as Row[];
  const rollupRows = (rollupData ?? []) as unknown as RollupRow[];
  const rollupByTrack = new Map<string, RollupRow>(
    rollupRows.map((r) => [r.track_id, r] as const),
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tracks</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Full catalog — open a track to review, moderate, feature, or hide. <strong>Artist (release)</strong> uses
            release credit metadata; if you uploaded for someone else, <span className="text-zinc-500">Account</span>{" "}
            shows the owning workspace. Engagement columns summarize downloads and ratings; open{" "}
            <strong>Analytics</strong> for timelines, featured overlap, feedback, and DJ lists. For internal promos and
            DJ service packs, use New DJ pack (no submission fee), then upload the full pack on the track page.
          </p>
        </div>
        <Link
          href="/admin/tracks/new"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          New DJ pack (internal)
        </Link>
      </div>

      {rollupErr ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950">
          Could not load engagement rollups: {rollupErr.message}. Apply migration{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
            20260530120000_admin_track_analytics_access
          </code>{" "}
          or refresh after deploy.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Artist (release)</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Catalog</th>
              <th className="px-3 py-2 font-medium text-right tabular-nums">DL</th>
              <th className="px-3 py-2 font-medium text-right tabular-nums">Avg ★</th>
              <th className="px-3 py-2 font-medium text-right tabular-nums"># ★</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const workspace = workspaceArtistNote(r.credit_artist_name, r.artists?.display_name);
              return (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <Link href={`/admin/tracks/${r.id}`} className="font-medium underline underline-offset-4">
                    {r.title}
                  </Link>
                  {r.is_draft ? (
                    <span className="ml-2 text-xs text-zinc-500">draft</span>
                  ) : null}
                  <div className="mt-1">
                    <Link
                      href={`/admin/tracks/${r.id}/analytics`}
                      className="text-xs font-medium text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
                    >
                      Analytics
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                  <div className="font-medium">
                    {primaryReleaseArtistLabel(r.credit_artist_name, r.artists?.display_name)}
                  </div>
                  {workspace ? (
                    <div className="mt-0.5 text-xs font-normal text-zinc-500">Account: {workspace}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2">{r.moderation_status}</td>
                <td className="px-3 py-2">{r.catalog_active === false ? "hidden" : "live"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {rollupByTrack.get(r.id)?.downloads_total ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {rollupByTrack.get(r.id)?.avg_rating != null
                    ? Number(rollupByTrack.get(r.id)!.avg_rating).toFixed(1)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {rollupByTrack.get(r.id)?.ratings_count ?? "—"}
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <AdminDeleteTrackButton trackId={r.id} trackTitle={r.title} />
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      {list.length === 0 ? <p className="text-sm text-zinc-500">No tracks.</p> : null}
    </div>
  );
}
