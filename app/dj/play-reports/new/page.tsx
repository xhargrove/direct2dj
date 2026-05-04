import Link from "next/link";
import { PlayReportForm } from "@/components/dj/play-report-form";
import type { DjCatalogFeedRow } from "@/lib/dj/catalog-feed";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DjNewPlayReportPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const trackIdParam = typeof sp.trackId === "string" ? sp.trackId : null;

  const supabase = await createClient();
  const { data: feedRows } = await supabase.rpc("dj_catalog_feed", {
    p_limit: 100,
    p_offset: 0,
  });

  const feed = (feedRows ?? []) as DjCatalogFeedRow[];
  const trackOptions = feed.map((r) => ({
    id: r.track_id,
    label: `${r.title} — ${r.credit_artist_name}`,
  }));

  let unknownTrackId = false;
  if (trackIdParam && !trackOptions.some((o) => o.id === trackIdParam)) {
    const { data: t } = await supabase
      .from("tracks")
      .select("id, title, credit_artist_name")
      .eq("id", trackIdParam)
      .maybeSingle();
    if (t) {
      trackOptions.unshift({
        id: t.id,
        label: `${t.title} — ${t.credit_artist_name}`,
      });
    } else {
      unknownTrackId = true;
    }
  }

  const defaultTrackId =
    trackIdParam && trackOptions.some((o) => o.id === trackIdParam) ? trackIdParam : null;
  const defaultPlayedAt = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Report a play</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Log when and where you played a track. Reports are self-reported until an admin verifies
          them.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/dj/play-reports" className="underline underline-offset-4">
            All your play reports
          </Link>
        </p>
      </div>

      <PlayReportForm
        trackOptions={trackOptions}
        defaultTrackId={defaultTrackId}
        defaultPlayedAt={defaultPlayedAt}
        unknownTrackId={unknownTrackId}
      />
    </div>
  );
}
