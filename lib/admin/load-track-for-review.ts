import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Artist, FeaturedPlacement, Profile, Track, TrackFile } from "@/lib/types/database";

export type DjEngagementRow = {
  djId: string;
  displayName: string;
  downloadCount: number;
  ratingCount: number;
  playReportsTotal: number;
};

export type TrackEngagementStats = {
  downloadCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  feedbackCount: number;
  playReportsTotal: number;
  byDj: DjEngagementRow[];
};

export type TrackReviewBundle = {
  track: Track;
  files: TrackFile[];
  artist: Artist;
  profile: Pick<Profile, "email" | "full_name">;
  featuredRows: FeaturedPlacement[];
  engagement: TrackEngagementStats;
};

export async function loadTrackForReview(
  supabase: SupabaseClient,
  trackId: string,
): Promise<{ data: TrackReviewBundle } | { error: string }> {
  const { data: track, error: tErr } = await supabase.from("tracks").select("*").eq("id", trackId).maybeSingle();

  if (tErr || !track) {
    return { error: tErr?.message ?? "Track not found." };
  }

  const { data: artist, error: aErr } = await supabase
    .from("artists")
    .select("*")
    .eq("id", track.artist_id)
    .maybeSingle();

  if (aErr || !artist) {
    return { error: aErr?.message ?? "Artist not found." };
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", artist.profile_id)
    .maybeSingle();

  if (pErr || !profile) {
    return { error: pErr?.message ?? "Profile not found." };
  }

  const { data: files } = await supabase
    .from("track_files")
    .select("*")
    .eq("track_id", trackId)
    .order("sort_order", { ascending: true });

  const { data: featuredRows } = await supabase
    .from("featured_placements")
    .select("*")
    .eq("track_id", trackId)
    .order("created_at", { ascending: false });

  const { count: downloadCount } = await supabase
    .from("downloads")
    .select("*", { count: "exact", head: true })
    .eq("track_id", trackId);

  const { data: ratings } = await supabase.from("ratings").select("dj_id, score").eq("track_id", trackId);

  const { count: feedbackCount } = await supabase
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("track_id", trackId);

  const { data: plays } = await supabase.from("play_reports").select("dj_id, play_count").eq("track_id", trackId);

  const { data: downloadRows } = await supabase
    .from("downloads")
    .select("dj_id, djs ( display_name )")
    .eq("track_id", trackId);

  const ratingScores = (ratings ?? []).map((r) => r.score);
  const ratingCount = ratingScores.length;
  const ratingAvg =
    ratingCount > 0 ? ratingScores.reduce((a, b) => a + b, 0) / ratingCount : null;

  const playReportsTotal = (plays ?? []).reduce((sum, row) => sum + row.play_count, 0);

  type DjNameRow = { dj_id: string; djs: { display_name: string } | null };
  const rawDownloads = (downloadRows ?? []) as unknown as DjNameRow[];
  const ratingByDj = new Map<string, number>();
  for (const r of ratings ?? []) {
    ratingByDj.set(r.dj_id, (ratingByDj.get(r.dj_id) ?? 0) + 1);
  }
  const playsByDj = new Map<string, number>();
  for (const r of plays ?? []) {
    playsByDj.set(r.dj_id, (playsByDj.get(r.dj_id) ?? 0) + r.play_count);
  }

  const djIds = new Set<string>();
  for (const r of rawDownloads) djIds.add(r.dj_id);
  for (const id of ratingByDj.keys()) djIds.add(id);
  for (const id of playsByDj.keys()) djIds.add(id);

  const ids = [...djIds];
  const { data: djMeta } =
    ids.length > 0
      ? await supabase.from("djs").select("id, display_name").in("id", ids)
      : { data: [] as { id: string; display_name: string }[] };
  const nameByDj = new Map((djMeta ?? []).map((d) => [d.id, d.display_name]));

  const byDj: DjEngagementRow[] = ids.map((djId) => {
    const fromDl = rawDownloads.find((d) => d.dj_id === djId);
    return {
      djId,
      displayName: nameByDj.get(djId) ?? fromDl?.djs?.display_name ?? djId,
      downloadCount: rawDownloads.filter((d) => d.dj_id === djId).length,
      ratingCount: ratingByDj.get(djId) ?? 0,
      playReportsTotal: playsByDj.get(djId) ?? 0,
    };
  });
  byDj.sort((a, b) => b.downloadCount + b.playReportsTotal - (a.downloadCount + a.playReportsTotal));

  return {
    data: {
      track: track as Track,
      files: (files ?? []) as TrackFile[],
      artist: artist as Artist,
      profile,
      featuredRows: (featuredRows ?? []) as FeaturedPlacement[],
      engagement: {
        downloadCount: downloadCount ?? 0,
        ratingAvg,
        ratingCount,
        feedbackCount: feedbackCount ?? 0,
        playReportsTotal,
        byDj,
      },
    },
  };
}
