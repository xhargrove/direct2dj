import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function buildAdminTracksSearchOrFilter(
  q: string,
  artistIds: string[] = [],
): string | null {
  const trimmed = q.trim();
  if (!trimmed) return null;

  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const parts = [`title.ilike.${pattern}`, `credit_artist_name.ilike.${pattern}`];

  if (UUID_RE.test(trimmed)) {
    parts.push(`id.eq.${trimmed}`);
  }

  if (artistIds.length > 0) {
    parts.push(`artist_id.in.(${artistIds.join(",")})`);
  }

  return parts.join(",");
}

export async function loadArtistIdsForTrackSearch(
  supabase: SupabaseClient,
  q: string,
): Promise<string[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const { data } = await supabase.from("artists").select("id").ilike("display_name", pattern).limit(50);

  return (data ?? []).map((row) => row.id as string);
}
