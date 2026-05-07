/** Row shape returned by `public.dj_catalog_feed` RPC. */
export type DjCatalogFeedRow = {
  track_id: string;
  title: string;
  credit_artist_name: string;
  genre: string;
  bpm: number | null;
  musical_key: string | null;
  explicit_rating: "explicit" | "clean";
  release_date: string | null;
  created_at: string;
  artist_display_name: string;
  cover_storage_path: string | null;
  download_count: number;
  rating_avg: number | null;
  rating_count: number;
  label_roster_release?: boolean;
};
