"use server";

import { revalidatePath } from "next/cache";
import { getApprovedDjCatalogContext, getDjContext } from "@/lib/dj/context";
import {
  notifyTrackDownloaded,
  notifyTrackFeedback,
  notifyTrackRated,
} from "@/lib/notifications/events";
import {
  validateFeedbackBody,
  validateOptionalCrowdReaction,
  validateRatingComment,
  validateRatingScore,
  validateYesNoAnswer,
} from "@/lib/dj/catalog-validation";
import { loadVisibleTrackFiles, resolvePackDownload } from "@/lib/dj/pack-download-server";
import type { CrowdReaction, PackSlotDb } from "@/lib/types/database";

const PREVIEW_SLOTS: PackSlotDb[] = [
  "radio_edit",
  "dirty_full",
  "instrumental",
  "acapella",
  "intro_edit",
  "short_edit",
];

export type DjRatingInput = {
  score: number;
  club_ready: boolean | null;
  radio_ready: boolean | null;
  rating_comment: string | null;
  crowd_reaction: CrowdReaction | null;
};

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

export type PackDownloadResult = { zipUrl: string; fileCount: number };

/** Logs a download and returns the ZIP pack URL (authenticated DJ only). */
export async function prepareDjPackDownload(trackId: string): Promise<
  PackDownloadResult | { error: string }
> {
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) return { error: ctx.error };

  const resolved = await resolvePackDownload(ctx.supabase, trackId, ctx.djId);
  if ("error" in resolved) return { error: resolved.error };

  const { error: dlErr } = await ctx.supabase.from("downloads").insert({
    track_id: trackId,
    dj_id: ctx.djId,
    status: "active",
    package_manifest: resolved.packageManifest,
  });
  if (dlErr) return { error: dlErr.message };

  await notifyTrackDownloaded(trackId);

  revalidatePath("/dj/downloads");
  revalidatePath("/dj/history");
  revalidatePath("/artist/analytics");
  revalidatePath(`/dj/tracks/${trackId}`);

  return {
    zipUrl: `/api/dj/tracks/${trackId}/pack`,
    fileCount: resolved.files.length,
  };
}

export async function submitRating(trackId: string, input: DjRatingInput) {
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) return { error: ctx.error };

  const scoreCheck = validateRatingScore(input.score);
  if (!scoreCheck.ok) return { error: scoreCheck.error };
  const s = scoreCheck.value;

  const commentRaw = input.rating_comment?.trim() || null;
  const commentCheck = validateRatingComment(commentRaw);
  if (!commentCheck.ok) return { error: commentCheck.error };
  const comment = commentCheck.value;

  const clubCheck = validateYesNoAnswer(input.club_ready, "club ready");
  if (!clubCheck.ok) return { error: clubCheck.error };

  const radioCheck = validateYesNoAnswer(input.radio_ready, "radio ready");
  if (!radioCheck.ok) return { error: radioCheck.error };

  const crowdCheck = validateOptionalCrowdReaction(input.crowd_reaction);
  if (!crowdCheck.ok) return { error: crowdCheck.error };

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
      club_ready: clubCheck.value,
      radio_ready: radioCheck.value,
      rating_comment: comment,
      crowd_reaction: crowdCheck.value,
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

export async function submitFeedback(trackId: string, body: string) {
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) return { error: ctx.error };

  const fbCheck = validateFeedbackBody(body);
  if (!fbCheck.ok) return { error: fbCheck.error };
  const text = fbCheck.value;

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

    await notifyTrackFeedback(trackId);

    revalidatePath(`/dj/tracks/${trackId}`);
    revalidatePath("/dj/history");
    revalidatePath("/artist/analytics");
    return {
      ok: true as const,
      body: text,
      moderation_status: existing.moderation_status ?? "pending",
    };
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
  return { ok: true as const, body: text, moderation_status: "pending" as const };
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
  revalidatePath("/dj/profile");
  revalidatePath("/dj/profile/edit");
  revalidatePath("/artist/analytics");
  return { ok: true as const };
}

export async function updateDjProfile(input: {
  display_name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
}) {
  const ctx = await getDjContext();
  if ("error" in ctx) return { error: ctx.error };

  const name = input.display_name.trim();
  if (name.length < 2) return { error: "Display name must be at least 2 characters." };
  if (name.length > 120) return { error: "Display name must be 120 characters or less." };

  const bioRaw = input.bio?.trim() ?? "";
  const bio = bioRaw.length === 0 ? null : bioRaw;
  if (bio && bio.length > 2000) return { error: "Bio must be 2000 characters or less." };

  const cityTrim = input.city?.trim() ?? "";
  const city = cityTrim.length === 0 ? null : cityTrim;
  if (city && city.length > 120) return { error: "City must be 120 characters or less." };

  const stateTrim = input.state?.trim() ?? "";
  const state = stateTrim.length === 0 ? null : stateTrim;
  if (state && state.length > 120) return { error: "State or region must be 120 characters or less." };

  const { error } = await ctx.supabase
    .from("djs")
    .update({
      display_name: name,
      bio,
      city,
      state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.djId);

  if (error) return { error: error.message };

  revalidatePath("/dj/profile");
  revalidatePath("/dj/profile/edit");
  revalidatePath("/dj/settings");
  revalidatePath("/artist/analytics");
  return { ok: true as const };
}
