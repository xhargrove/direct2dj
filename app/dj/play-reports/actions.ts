"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getApprovedDjCatalogContext } from "@/lib/dj/context";
import { notifyTrackPlayReported } from "@/lib/notifications/events";
import type { CrowdReaction } from "@/lib/types/database";

const VALID_REACTIONS: CrowdReaction[] = ["cold", "warm", "strong", "hit_potential"];

export async function submitPlayReport(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await getApprovedDjCatalogContext();
  if ("error" in ctx) return { error: ctx.error };

  const trackId = formData.get("track_id")?.toString().trim() ?? "";
  if (!trackId) return { error: "Choose a track." };

  const venue_name = formData.get("venue_name")?.toString().trim() ?? "";
  const city = formData.get("city")?.toString().trim() || null;
  const state = formData.get("state")?.toString().trim() || null;
  const event_name = formData.get("event_name")?.toString().trim() ?? "";
  const playedRaw = formData.get("played_at")?.toString().trim() ?? "";
  const estimated_crowd_size = formData.get("estimated_crowd_size")?.toString().trim() ?? "";
  const notes = formData.get("notes")?.toString().trim() ?? "";
  const proofRaw = formData.get("proof_url")?.toString().trim() ?? "";
  const reactionRaw = formData.get("crowd_reaction")?.toString().trim() ?? "";

  if (venue_name.length < 2) return { error: "Venue name is required." };
  if (event_name.length < 2) return { error: "Event name is required." };
  if (!playedRaw) return { error: "Date played is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playedRaw)) return { error: "Use a valid date." };
  if (estimated_crowd_size.length < 1) return { error: "Estimated crowd size is required." };

  let proof_url: string | null = null;
  if (proofRaw) {
    try {
      void new URL(proofRaw);
      proof_url = proofRaw;
    } catch {
      return { error: "Proof link must be a valid URL." };
    }
  }

  let crowd_reaction: CrowdReaction | null = null;
  if (reactionRaw) {
    if (!VALID_REACTIONS.includes(reactionRaw as CrowdReaction)) {
      return { error: "Invalid crowd reaction." };
    }
    crowd_reaction = reactionRaw as CrowdReaction;
  }

  const { error } = await ctx.supabase.from("play_reports").insert({
    track_id: trackId,
    dj_id: ctx.djId,
    period_start: playedRaw,
    period_end: playedRaw,
    play_count: 1,
    status: "active",
    venue_name,
    city,
    state,
    event_name,
    played_at: playedRaw,
    estimated_crowd_size,
    crowd_reaction,
    notes,
    proof_url,
    verification_status: "self_reported",
  });

  if (error) return { error: error.message };

  await notifyTrackPlayReported(trackId);

  revalidatePath("/dj/play-reports");
  revalidatePath("/dj/history");
  revalidatePath("/artist/play-reports");
  revalidatePath("/admin/play-reports");
  revalidatePath("/artist/analytics");
  revalidatePath(`/dj/tracks/${trackId}`);
  redirect("/dj/play-reports?submitted=1");
}
