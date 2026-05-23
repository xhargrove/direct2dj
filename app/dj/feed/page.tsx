import { Suspense } from "react";
import Link from "next/link";
import { DjFeedFiltersBar } from "@/components/dj/feed-filters-bar";
import { DjTrackCard } from "@/components/dj/track-card";
import { SpotlightHubContent } from "@/components/spotlight/spotlight-hub-content";
import { signCoverPaths } from "@/lib/dj/cover-sign";
import type { DjCatalogFeedRow } from "@/lib/dj/catalog-feed";
import { pickRecentArtistSpotlight } from "@/lib/dj/recent-artist-spotlight";
import { loadSpotlightHub, spotlightTrackIds } from "@/lib/spotlight/load-spotlight-hub";
import { createClient } from "@/lib/supabase/server";

type FeedSearch = {
  q: string;
  genre: string;
  bpmMin: number | null;
  bpmMax: number | null;
  explicit: string;
  sort: string;
  page: number;
};

function parseFeedSearch(sp: Record<string, string | string[] | undefined>): FeedSearch {
  const bpmMinRaw = typeof sp.bpm_min === "string" ? sp.bpm_min : "";
  const bpmMaxRaw = typeof sp.bpm_max === "string" ? sp.bpm_max : "";
  const bpmMin = bpmMinRaw.trim() === "" ? null : Number(bpmMinRaw);
  const bpmMax = bpmMaxRaw.trim() === "" ? null : Number(bpmMaxRaw);
  const pageRaw = typeof sp.page === "string" ? sp.page : "1";

  return {
    q: typeof sp.q === "string" ? sp.q : "",
    genre: typeof sp.genre === "string" ? sp.genre : "",
    bpmMin: bpmMin !== null && Number.isFinite(bpmMin) ? bpmMin : null,
    bpmMax: bpmMax !== null && Number.isFinite(bpmMax) ? bpmMax : null,
    explicit: typeof sp.explicit === "string" ? sp.explicit : "",
    sort: typeof sp.sort === "string" ? sp.sort : "newest",
    page: Math.max(1, parseInt(pageRaw, 10) || 1),
  };
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

async function catalogExcludeIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  search: FeedSearch,
): Promise<string[]> {
  if (search.page !== 1) return [];

  const hub = await loadSpotlightHub({ limitPerSection: 8 });
  const hubTrackIds = spotlightTrackIds(hub.sections);

  const { data: newestPool } = await supabase.rpc("dj_catalog_feed", {
    p_search: search.q.trim() || null,
    p_genre: search.genre.trim() || null,
    p_bpm_min: search.bpmMin,
    p_bpm_max: search.bpmMax,
    p_explicit: search.explicit === "clean" || search.explicit === "explicit" ? search.explicit : null,
    p_sort: "newest",
    p_exclude_ids: hubTrackIds.length ? hubTrackIds : [],
    p_limit: 48,
    p_offset: 0,
  });

  const recentArtistTrackIds = pickRecentArtistSpotlight((newestPool ?? []) as DjCatalogFeedRow[], 8).map(
    (r) => r.track_id,
  );

  return [...new Set([...hubTrackIds, ...recentArtistTrackIds.filter(Boolean)])];
}

async function FeedSpotlight({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;
  const search = parseFeedSearch(sp);

  if (search.page !== 1) return null;

  const hub = await loadSpotlightHub({ limitPerSection: 8 });
  const hubTrackIds = spotlightTrackIds(hub.sections);

  const { data: newestPool } = await supabase.rpc("dj_catalog_feed", {
    p_search: search.q.trim() || null,
    p_genre: search.genre.trim() || null,
    p_bpm_min: search.bpmMin,
    p_bpm_max: search.bpmMax,
    p_explicit: search.explicit === "clean" || search.explicit === "explicit" ? search.explicit : null,
    p_sort: "newest",
    p_exclude_ids: hubTrackIds.length ? hubTrackIds : [],
    p_limit: 48,
    p_offset: 0,
  });

  const spotlightRows = pickRecentArtistSpotlight((newestPool ?? []) as DjCatalogFeedRow[], 8);
  const coverPaths = spotlightRows.map((r) => r.cover_storage_path).filter(Boolean) as string[];
  const coverMap = await signCoverPaths(supabase, coverPaths);

  const showHub = hub.sections.some((s) => s.items.length > 0);

  if (!showHub && spotlightRows.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {showHub ? (
        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Spotlight hub</h2>
          <SpotlightHubContent sections={hub.sections} linkMode="dj" variant="dj" error={hub.error} />
        </section>
      ) : null}

      {spotlightRows.length > 0 ? (
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
    </div>
  );
}

async function FeedCatalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;
  const search = parseFeedSearch(sp);
  const limit = 24;
  const offset = (search.page - 1) * limit;

  const excludeIds = await catalogExcludeIds(supabase, search);

  const { data: feedRows, error: feedErr } = await supabase.rpc("dj_catalog_feed", {
    p_search: search.q.trim() || null,
    p_genre: search.genre.trim() || null,
    p_bpm_min: search.bpmMin,
    p_bpm_max: search.bpmMax,
    p_explicit: search.explicit === "clean" || search.explicit === "explicit" ? search.explicit : null,
    p_sort: search.sort || "newest",
    p_exclude_ids: excludeIds.length ? excludeIds : [],
    p_limit: limit,
    p_offset: offset,
  });

  const feed = (feedRows ?? []) as DjCatalogFeedRow[];
  const coverPaths = feed.map((r) => r.cover_storage_path).filter(Boolean) as string[];
  const coverMap = await signCoverPaths(supabase, coverPaths);

  return (
    <div className="flex flex-col gap-8">
      {feedErr ? (
        <p className="text-sm text-red-600">
          Could not load catalog{feedErr.message ? `: ${feedErr.message}` : ""}. Apply migration{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">20260511120000_dj_catalog_feed</code>.
        </p>
      ) : null}

      {!feedErr ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Browse catalog</h2>
          {feed.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {search.q.trim() || search.genre.trim() || search.bpmMin != null || search.bpmMax != null || search.explicit
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
      ) : null}

      {!feedErr ? (
        <div className="flex justify-between gap-4 pt-4 text-sm">
          {search.page > 1 ? (
            <Link
              href={`/dj/feed?${toQueryString(sp, { page: String(search.page - 1) })}`}
              className="underline underline-offset-4"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {feed.length === limit ? (
            <Link
              href={`/dj/feed?${toQueryString(sp, { page: String(search.page + 1) })}`}
              className="underline underline-offset-4"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
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
          Spotlight picks first, then filter and browse the catalog.{" "}
          <Link href="#discover-filters" className="font-medium underline underline-offset-4">
            Jump to filters
          </Link>
          {" "}— they stay pinned as you scroll.
        </p>
      </div>

      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />}>
        <FeedSpotlight searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />}>
        <DjFeedFiltersBar />
      </Suspense>

      <Suspense fallback={<p className="text-sm text-zinc-500">Loading catalog…</p>}>
        <FeedCatalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
