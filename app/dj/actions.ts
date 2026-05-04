"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getApprovedDjCatalogContext, getDjContext } from "@/lib/dj/context";
import {
  notifyTrackDownloaded,
  notifyTrackFeedback,
  notifyTrackRated,
} from "@/lib/notifications/events";
import type { CrowdReaction, PackSlotDb } from "@/lib/types/database";

const PREVIEW_SLOTS: PackSlotDb[] = [
  "radio_edit",
  "dirty_full",
  "instrumental",
  "acapella",
  "intro_edit",
  "short_edit",
];

function fileNameFromPath(path: string): string {
  const seg = path.split("/").pop();
  return seg && seg.length > 0 ? seg : "file";
}

export type DjRatingInput = {
  score: number;
  club_ready: boolean | null;
  radio_ready: boolean | null;
  rating_comment: string | null;
  crowd_reaction: CrowdReaction | null;
};

async function loadVisibleTrackFiles(
  supabase: SupabaseClient,
  trackId: string,
): Promise<
  | {
      files: {
        id: string;
        storage_path: string;
        pack_slot: string | null;
        kind: string;
        mime_type: string | null;
      }[];
    }
  | { error: string }
> {
  const { data: track, error: tErr } = await supabase.from("tracks").select("id").eq("id", trackId).maybeSingle();
  if (tErr || !track) {
    return { error: "Track not found or not available in the catalog." };
  }
  const { data: files, error: fErr } = await supabase
    .from("track_files")
    .select("id, storage_path, pack_slot, kind, mime_type")
    .eq("track_id", trackId)
    .order("sort_order", { ascending: true });
  if (fErr) return { error: fErr.message };
  return { files: files ?? [] };
}

export async function signTrackPreview(trackId: string) {
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) return { error: ctx.error };

  const loaded = await loadVisibleTrackFiles(ctx.supabase, trackId);
  if ("error" in loaded) return { error: loaded.error };
  if (!("files" in loaded)) return { error: "Could not load files." };

  const files = loaded.files;
  let path: string | null = null;
  for (const slot of PREVIEW_SLOTS) {
    const hit = files.find((f) => f.pack_slot === slot);
    if (hit?.storage_path) {
      path = hit.storage_path;
      break;
    }
  }
  if (!path) {
    const audio = files.find((f) => f.kind === "audio" || f.mime_type?.startsWith("audio/"));
    path = audio?.storage_path ?? null;
  }
  if (!path) return { error: "No preview audio found for this track." };

  const { data, error } = await ctx.supabase.storage.from("promos").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return { error: error?.message ?? "Could not create preview URL." };
  return { signedUrl: data.signedUrl };
}

export type PackDownloadFile = { pack_slot: string | null; filename: string; signedUrl: string };

/** Logs a download with package manifest and returns signed URLs for each pack file (authenticated DJ only). */
export async function prepareDjPackDownload(trackId: string) {
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) return { error: ctx.error };

  const loaded = await loadVisibleTrackFiles(ctx.supabase, trackId);
  if ("error" in loaded) return { error: loaded.error };
  if (!("files" in loaded)) return { error: "Could not load files." };

  const files = loaded.files.filter((f) => f.storage_path);
  if (files.length === 0) return { error: "No files in this pack." };

  const package_manifest = files.map((f) => ({
    track_file_id: f.id,
    pack_slot: f.pack_slot,
    storage_path: f.storage_path,
  }));

  const { error: dlErr } = await ctx.supabase.from("downloads").insert({
    track_id: trackId,
    dj_id: ctx.djId,
    status: "active",
    package_manifest,
  });
  if (dlErr) return { error: dlErr.message };

  await notifyTrackDownloaded(trackId);

  const out: PackDownloadFile[] = [];
  for (const f of files) {
    const { data, error } = await ctx.supabase.storage.from("promos").createSignedUrl(f.storage_path, 3600);
    if (error || !data?.signedUrl) {
      return { error: error?.message ?? "Could not sign pack file." };
    }
    out.push({
      pack_slot: f.pack_slot,
      filename: fileNameFromPath(f.storage_path),
      signedUrl: data.signedUrl,
    });
  }

  revalidatePath("/dj/downloads");
  revalidatePath("/dj/history");
  revalidatePath("/artist/analytics");
  return { files: out };
}

export async function submitRating(trackId: string, input: DjRatingInput) {
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) return { error: ctx.error };

  const s = Math.round(Number(input.score));
  if (!Number.isFinite(s) || s < 1 || s > 5) return { error: "Rating must be between 1 and 5." };

  const comment = input.rating_comment?.trim() || null;
  if (comment && comment.length > 4000) {
    return { error: "Rating note must be 4000 characters or less." };
  }

  const { data: existingRating } = await ctx.supabase
    .from("ratings")
    .select("id")
    .eq("track_id", trackId)
    .eq("dj_id", ctx.djId)
    .maybeSingle();

  const { error } = await ctx.supabase.from("ratings").upsert(
    {
      track_id: trackId,
      dj_id: ctx.djId,
      score: s,
      club_ready: input.club_ready,
      radio_ready: input.radio_ready,
      rating_comment: comment,
      crowd_reaction: input.crowd_reaction,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "track_id,dj_id" },
  );

  if (error) return { error: error.message };

  await notifyTrackRated(trackId, s, Boolean(existingRating));

  revalidatePath("/dj/feed");
  revalidatePath(`/dj/tracks/${trackId}`);
  revalidatePath("/dj/history");
  revalidatePath("/artist/analytics");
  return { ok: true as const };
}

const FEEDBACK_MAX_LEN = 8000;

export async function submitFeedback(trackId: string, body: string) {
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) return { error: ctx.error };

  const text = body.trim();
  if (text.length < 3) return { error: "Feedback must be at least a few characters." };
  if (text.length > FEEDBACK_MAX_LEN) {
    return { error: `Feedback must be ${FEEDBACK_MAX_LEN} characters or less.` };
  }

  const { data: existing } = await ctx.supabase
    .from("feedback")
    .select("id, moderation_status")
    .eq("track_id", trackId)
    .eq("dj_id", ctx.djId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await ctx.supabase
      .from("feedback")
      .update({
        body: text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await ctx.supabase.from("feedback").insert({
      track_id: trackId,
      dj_id: ctx.djId,
      body: text,
      moderation_status: "pending",
    });

    if (error) return { error: error.message };
  }

  await notifyTrackFeedback(trackId);

  revalidatePath(`/dj/tracks/${trackId}`);
  revalidatePath("/dj/history");
  revalidatePath("/artist/analytics");
  return { ok: true as const };
}

export async function updateAllowArtistContact(allow: boolean) {
  const ctx = await getDjContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("djs")
    .update({ allow_artist_contact: allow, updated_at: new Date().toISOString() })
    .eq("id", ctx.djId);

  if (error) return { error: error.message };

  revalidatePath("/dj/settings");
  revalidatePath("/artist/analytics");
  return { ok: true as const };
}

export async function updateDjCity(cityRaw: string) {
  const ctx = await getDjContext();
  if ("error" in ctx) return { error: ctx.error };

  const t = cityRaw.trim();
  const city = t.length === 0 ? null : t;
  if (city && city.length > 120) return { error: "City must be 120 characters or less." };

  const { error } = await ctx.supabase
    .from("djs")
    .update({ city, updated_at: new Date().toISOString() })
    .eq("id", ctx.djId);

  if (error) return { error: error.message };

  revalidatePath("/dj/settings");
  revalidatePath("/artist/analytics");
  return { ok: true as const };
}
