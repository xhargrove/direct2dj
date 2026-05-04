import type { DjCatalogFeedRow } from "@/lib/dj/catalog-feed";

/**
 * From a newest-first catalog feed, pick one representative track per artist (first occurrence = newest track).
 */
export function pickRecentArtistSpotlight(rows: DjCatalogFeedRow[], max: number): DjCatalogFeedRow[] {
  const seen = new Set<string>();
  const out: DjCatalogFeedRow[] = [];
  for (const r of rows) {
    const key = `${r.artist_display_name.trim().toLowerCase()}|${r.credit_artist_name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}
