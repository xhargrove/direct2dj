import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  packDownloadQualifies,
  validateFeedbackBody,
} from "@/lib/dj/catalog-validation";
import { djPackDownloadFilename } from "@/lib/tracks/dj-download-filename";

export type PackFileRow = {
  id: string;
  storage_path: string;
  pack_slot: string | null;
  kind: string;
  mime_type: string | null;
};

export type PackDownloadEntry = {
  storage_path: string;
  filename: string;
  pack_slot: string | null;
};

export type ResolvedPackDownload =
  | {
      releaseTitle: string;
      creditArtist: string;
      files: PackDownloadEntry[];
      packageManifest: {
        track_file_id: string;
        pack_slot: string | null;
        storage_path: string;
      }[];
    }
  | { error: string };

export async function loadVisibleTrackFiles(
  supabase: SupabaseClient,
  trackId: string,
): Promise<{ files: PackFileRow[] } | { error: string }> {
  const { data: track, error: tErr } = await supabase.from("tracks").select("id").eq("id", trackId).maybeSingle();
  if (tErr || !track) {
    return {
      error:
        "Track not found or not visible in the DJ catalog (wrong ID, not approved, or catalog inactive).",
    };
  }
  const { data: files, error: fErr } = await supabase
    .from("track_files")
    .select("id, storage_path, pack_slot, kind, mime_type")
    .eq("track_id", trackId)
    .order("sort_order", { ascending: true });
  if (fErr) return { error: fErr.message };
  return { files: (files ?? []) as PackFileRow[] };
}

/** Validates feedback + rating and resolves pack files with DJ-friendly filenames. */
export async function resolvePackDownload(
  supabase: SupabaseClient,
  trackId: string,
  djId: string,
): Promise<ResolvedPackDownload> {
  const [{ data: feedbackRow }, { data: ratingRow }] = await Promise.all([
    supabase.from("feedback").select("body").eq("track_id", trackId).eq("dj_id", djId).maybeSingle(),
    supabase
      .from("ratings")
      .select("score, club_ready, radio_ready")
      .eq("track_id", trackId)
      .eq("dj_id", djId)
      .maybeSingle(),
  ]);

  if (
    !packDownloadQualifies({
      feedbackBody: feedbackRow?.body ?? null,
      rating: ratingRow ?? null,
    })
  ) {
    const hasFeedback =
      typeof feedbackRow?.body === "string" && validateFeedbackBody(feedbackRow.body).ok;
    if (!hasFeedback) {
      return {
        error:
          "Submit feedback for this track before downloading the DJ pack (at least a few characters). This helps artists improve their promos.",
      };
    }
    return {
      error:
        "Complete your rating (stars, club ready, and radio ready) before downloading the DJ pack.",
    };
  }

  const loaded = await loadVisibleTrackFiles(supabase, trackId);
  if ("error" in loaded) return loaded;

  const rows = loaded.files.filter((f) => f.storage_path);
  if (rows.length === 0) return { error: "No files in this pack." };

  const { data: trackMeta, error: metaErr } = await supabase
    .from("tracks")
    .select("title, credit_artist_name")
    .eq("id", trackId)
    .maybeSingle();

  if (metaErr) return { error: metaErr.message };

  const releaseTitle = (trackMeta?.title ?? "").trim() || "Track";
  const creditArtist = (trackMeta?.credit_artist_name ?? "").trim() || "Artist";

  const files: PackDownloadEntry[] = rows.map((f) => ({
    storage_path: f.storage_path,
    pack_slot: f.pack_slot,
    filename: djPackDownloadFilename({
      pack_slot: f.pack_slot,
      credit_artist_name: creditArtist,
      title: releaseTitle,
      storage_path: f.storage_path,
    }),
  }));

  const packageManifest = rows.map((f) => ({
    track_file_id: f.id,
    pack_slot: f.pack_slot,
    storage_path: f.storage_path,
  }));

  return { releaseTitle, creditArtist, files, packageManifest };
}
