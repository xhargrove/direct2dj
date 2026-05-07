import { Suspense } from "react";
import Link from "next/link";
import { DjFeedFilters } from "@/components/dj/feed-filters";
import { DjTrackCard } from "@/components/dj/track-card";
import { signCoverPaths } from "@/lib/dj/cover-sign";
import type { DjCatalogFeedRow } from "@/lib/dj/catalog-feed";
import { pickRecentArtistSpotlight } from "@/lib/dj/recent-artist-spotlight";
import { createClient } from "@/lib/supabase/server";

function firstTrack(tRaw: unknown) {
  if (tRaw && !Array.isArray(tRaw)) return tRaw as Record<string, unknown>;
  if (Array.isArray(tRaw) && tRaw[0]) return tRaw[0] as Record<string, unknown>;
  return null;
}

function toQueryString(
  sp: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | null>,
) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v && k !== "page") u.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null || v === "") u.delete(k);
    else u.set(k, v);
  }
  return u.toString();
}

async function FeedList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q : "";
  const genre = typeof sp.genre === "string" ? sp.genre : "";
  const bpmMinRaw = typeof sp.bpm_min === "string" ? sp.bpm_min : "";
  const bpmMaxRaw = typeof sp.bpm_max === "string" ? sp.bpm_max : "";
  const explicit = typeof sp.explicit === "string" ? sp.explicit : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";
  const pageRaw = typeof sp.page === "string" ? sp.page : "1";
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const limit = 24;
  const offset = (page - 1) * limit;

  const bpmMin = bpmMinRaw.trim() === "" ? null : Number(bpmMinRaw);
  const bpmMax = bpmMaxRaw.trim() === "" ? null : Number(bpmMaxRaw);

  const { data: featuredRaw } = await supabase
    .from("featured_placements")
    .select(
      `
      id,
      label,
      track_id,
      starts_at,
      ends_at,
      tracks (
        id,
        title,
        credit_artist_name,
        genre,
        bpm,
        explicit_rating,
        artists ( display_name )
      )
    `,
    )
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(48);

  type FeaturedPlacementRow = {
    id: string;
    label: string | null;
    track_id: string;
    starts_at: string | null;
    ends_at: string | null;
    tracks: unknown;
  };

  // Request-time snapshot for “active” featured window (RSC; not a client re-render).
  // eslint-disable-next-line react-hooks/purity -- single evaluation per request
  const nowMs = Date.now();
  const featuredRawList = ((featuredRaw ?? []) as FeaturedPlacementRow[]).filter((row) => {
    const startMs = row.starts_at ? new Date(row.starts_at).getTime() : 0;
    const endMs = row.ends_at ? new Date(row.ends_at).getTime() : Number.POSITIVE_INFINITY;
    return startMs <= nowMs && endMs > nowMs;
  });
  const seenTrack = new Set<string>();
  const featuredList: FeaturedPlacementRow[] = [];
  for (const row of featuredRawList) {
    if (!row.track_id || seenTrack.has(row.track_id)) continue;
    seenTrack.add(row.track_id);
    featuredList.push(row);
    if (featuredList.length >= 12) break;
  }

  const excludeIds = featuredList.map((f) => f.track_id).filter(Boolean);

  const { data: newestPool } = await supabase.rpc("dj_catalog_feed", {
    p_search: q.trim() || null,
    p_genre: genre.trim() || null,
    p_bpm_min: bpmMin !== null && Number.isFinite(bpmMin) ? bpmMin : null,
    p_bpm_max: bpmMax !== null && Number.isFinite(bpmMax) ? bpmMax : null,
    p_explicit: explicit === "clean" || explicit === "explicit" ? explicit : null,
    p_sort: "newest",
    p_exclude_ids: excludeIds.length ? excludeIds : [],
    p_limit: 48,
    p_offset: 0,
  });

  const spotlightRows =
    page === 1 ? pickRecentArtistSpotlight((newestPool ?? []) as DjCatalogFeedRow[], 8) : [];
  const spotlightTrackIds = spotlightRows.map((r) => r.track_id).filter(Boolean);

  const catalogExcludeIds =
    page === 1 && spotlightTrackIds.length > 0 ? [...excludeIds, ...spotlightTrackIds] : excludeIds;

  const { data: feedRows, error: feedErr } = await supabase.rpc("dj_catalog_feed", {
    p_search: q.trim() || null,
    p_genre: genre.trim() || null,
    p_bpm_min: bpmMin !== null && Number.isFinite(bpmMin) ? bpmMin : null,
    p_bpm_max: bpmMax !== null && Number.isFinite(bpmMax) ? bpmMax : null,
    p_explicit: explicit === "clean" || explicit === "explicit" ? explicit : null,
    p_sort: sort || "newest",
    p_exclude_ids: catalogExcludeIds.length ? catalogExcludeIds : [],
    p_limit: limit,
    p_offset: offset,
  });

  const feed = (feedRows ?? []) as DjCatalogFeedRow[];

  const featuredTrackIds = featuredList.map((f) => f.track_id).filter(Boolean);
  let covRows: { track_id: string; storage_path: string }[] = [];
  if (featuredTrackIds.length > 0) {
    const { data: cr } = await supabase
      .from("track_files")
      .select("track_id, storage_path")
      .eq("pack_slot", "cover_art")
      .in("track_id", featuredTrackIds);
    covRows = cr ?? [];
  }

  const coverPaths: string[] = [];
  for (const r of spotlightRows) {
    if (r.cover_storage_path) coverPaths.push(r.cover_storage_path);
  }
  for (const r of feed) {
    if (r.cover_storage_path) coverPaths.push(r.cover_storage_path);
  }
  for (const c of covRows) {
    if (c.storage_path) coverPaths.push(c.storage_path);
  }

  const coverMap = await signCoverPaths(supabase, coverPaths);

  const featuredCards = featuredList.map((fp) => {
    const t = firstTrack(fp.tracks);
    const artistName =
      (t?.artists as { display_name?: string } | undefined)?.display_name ?? "";
    const tid = (typeof t?.id === "string" ? t.id : null) ?? fp.track_id;
    const coverPath = covRows.find((c) => c.track_id === tid)?.storage_path ?? null;
    return {
      fp,
      tid,
      title: typeof t?.title === "string" ? t.title : "Track",
      artistLine:
        typeof t?.credit_artist_name === "string" && t.credit_artist_name
          ? `${t.credit_artist_name}${artistName ? ` · ${artistName}` : ""}`
          : artistName || "Artist",
      genre: typeof t?.genre === "string" ? t.genre : "",
      bpm:
        typeof t?.bpm === "number"
          ? t.bpm
          : typeof t?.bpm === "string"
            ? parseFloat(t.bpm)
            : null,
      explicitLabel: t?.explicit_rating === "explicit" ? "Explicit" : "Clean",
      coverUrl: coverPath ? coverMap.get(coverPath) ?? null : null,
      label: fp.label,
    };
  });

  return (
    <>
      {feedErr ? (
        <p className="text-sm text-red-600">
          Could not load catalog{feedErr.message ? `: ${feedErr.message}` : ""}. Apply migration{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">20260511120000_dj_catalog_feed</code>.
        </p>
      ) : null}

      {!feedErr && spotlightRows.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recently published artists</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Newest approved promo per artist (matches your filters). Updated as artists submit packs.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {spotlightRows.map((r) => (
              <DjTrackCard
                key={`spotlight-${r.track_id}`}
                id={r.track_id}
                title={r.title}
                artistLine={
                  r.credit_artist_name
                    ? `${r.credit_artist_name} · ${r.artist_display_name}`
                    : r.artist_display_name
                }
                genre={r.genre}
                bpm={r.bpm != null ? Number(r.bpm) : null}
                explicitLabel={r.explicit_rating === "explicit" ? "Explicit" : "Clean"}
                coverUrl={r.cover_storage_path ? coverMap.get(r.cover_storage_path) ?? null : null}
                labelRosterRelease={Boolean(r.label_roster_release)}
                footer={<span className="text-zinc-500">Latest from this artist</span>}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!feedErr && featuredCards.length > 0 ? (
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Featured</h2>
            <p className="mt-1.5 text-base text-zinc-600 dark:text-zinc-400">
              Spotlight picks at the top of Discover — open a pack to preview and download.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {featuredCards.map(({ fp, tid, title, artistLine, genre, bpm, explicitLabel, coverUrl, label }) => (
              <DjTrackCard
                key={fp.id}
                variant="featured"
                id={tid}
                title={title}
                artistLine={artistLine}
                genre={genre}
                bpm={bpm}
                explicitLabel={explicitLabel}
                coverUrl={coverUrl}
                footer={
                  label ? (
                    <span className="text-amber-800 dark:text-amber-300">{label}</span>
                  ) : null
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Browse catalog</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {q.trim() || genre.trim() || bpmMin != null || bpmMax != null || explicit
              ? "No tracks match these filters."
              : "No approved tracks in the catalog right now. Check back after artists publish packs."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {feed.map((r) => (
              <DjTrackCard
                key={r.track_id}
                id={r.track_id}
                title={r.title}
                artistLine={
                  r.credit_artist_name
                    ? `${r.credit_artist_name} · ${r.artist_display_name}`
                    : r.artist_display_name
                }
                genre={r.genre}
                bpm={r.bpm != null ? Number(r.bpm) : null}
                explicitLabel={r.explicit_rating === "explicit" ? "Explicit" : "Clean"}
                coverUrl={r.cover_storage_path ? coverMap.get(r.cover_storage_path) ?? null : null}
                labelRosterRelease={Boolean(r.label_roster_release)}
                footer={
                  <span>
                    {r.download_count} downloads ·{" "}
                    {r.rating_avg != null ? `${r.rating_avg} avg (${r.rating_count})` : "no ratings yet"}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-between gap-4 pt-4 text-sm">
        {page > 1 ? (
          <Link href={`/dj/feed?${toQueryString(sp, { page: String(page - 1) })}`} className="underline underline-offset-4">
            Previous
          </Link>
        ) : (
          <span />
        )}
        {feed.length === limit ? (
          <Link href={`/dj/feed?${toQueryString(sp, { page: String(page + 1) })}`} className="underline underline-offset-4">
            Next
          </Link>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}

async function DjFeedFiltersWithGenres() {
  const supabase = await createClient();
  const genreRows = await supabase.from("tracks").select("genre");
  const genreOptions = [...new Set((genreRows.data ?? []).map((r) => r.genre).filter(Boolean))].sort() as string[];
  return <DjFeedFilters genreOptions={genreOptions} />;
}

export default function DjFeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          See who just uploaded, then browse the full approved catalog. Featured slots follow schedule and visibility
          rules.
        </p>
      </div>

      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />}>
        <DjFeedFiltersWithGenres />
      </Suspense>

      <Suspense fallback={<p className="text-sm text-zinc-500">Loading catalog…</p>}>
        <FeedList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
